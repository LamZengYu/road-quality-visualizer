from pathlib import Path
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]  # ml/


def main():
    model = YOLO("yolov8n.pt")  # nano: smallest/fastest, good for phones
    model.train(
        data=str(ROOT / "data" / "data.yaml"),
        epochs=100,
        imgsz=640,
        batch=16,
        project=str(ROOT / "models"),
        name="potholes",
    )
    # best weights -> ml/models/potholes/weights/best.pt


if __name__ == "__main__":
    main()
