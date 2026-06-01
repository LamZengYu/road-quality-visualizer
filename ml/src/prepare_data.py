"""Prepare a YOLO-format dataset under ml/data/datasets/potholes/.

Expected layout (YOLO):
  images/train  images/val  images/test
  labels/train  labels/val  labels/test

If you label in Roboflow/CVAT, export in 'YOLOv8' format and drop it here, then
point ml/data/data.yaml at it. This script is a stub for any custom conversion or
train/val/test splitting you need.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # ml/


def main():
    ds = ROOT / "data" / "datasets" / "potholes"
    print(f"Dataset expected at: {ds}")
    print("See module docstring for the required layout.")


if __name__ == "__main__":
    main()
