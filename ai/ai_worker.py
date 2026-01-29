import os
import sqlite3
import time
from PIL import Image
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info
import torch

# Paths
DB_PATH = os.path.expanduser("~/Library/Application Support/com.luminaire.app/luminaire.db")
MODEL_ID = "Qwen/Qwen2-VL-2B-Instruct" # Fallback if Qwen3 is not standard

def init_model():
    print(f"Loading model: {MODEL_ID}")
    model = Qwen2VLForConditionalGeneration.from_pretrained(
        MODEL_ID, torch_dtype="auto", device_map="auto"
    )
    processor = AutoProcessor.from_pretrained(MODEL_ID)
    return model, processor

def tag_image(model, processor, image_path):
    print(f"Tagging: {image_path}")
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": f"file://{image_path}"},
                {"type": "text", "text": "Describe this image in a few comma-separated tags. Focus on objects, people, animals, and text. Format: tag1, tag2, tag3"},
            ],
        }
    ]

    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)
    inputs = processor(
        text=[text],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt",
    )
    inputs = inputs.to("cuda" if torch.cuda.is_available() else "cpu")
    if torch.backends.mps.is_available():
        inputs = inputs.to("mps")

    generated_ids = model.generate(**inputs, max_new_tokens=128)
    generated_ids_trimmed = [
        out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    output_text = processor.batch_decode(
        generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
    )[0]
    
    return [t.strip().lower() for t in output_text.split(",") if t.strip()]

def main():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. Waiting...")
        while not os.path.exists(DB_PATH):
            time.sleep(5)
    
    model, processor = init_model()
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    while True:
        # Find untagged images
        cursor.execute("""
            SELECT id, path FROM media 
            WHERE kind = 'image' 
            AND id NOT IN (SELECT media_id FROM tags WHERE source = 'ai')
            LIMIT 1
        """)
        row = cursor.fetchone()
        
        if row:
            media_id, path = row
            try:
                tags = tag_image(model, processor, path)
                for tag in tags:
                    cursor.execute(
                        "INSERT INTO tags (media_id, tag, confidence, source) VALUES (?, ?, ?, ?)",
                        (media_id, tag, 0.9, 'ai')
                    )
                conn.commit()
                print(f"Tagged {path} with: {tags}")
            except Exception as e:
                print(f"Error tagging {path}: {e}")
        else:
            print("No untagged images found. Sleeping...")
            time.sleep(10)

if __name__ == "__main__":
    main()
