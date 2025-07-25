#!/usr/bin/env python3
"""
Create a simple DICOM file for testing purposes.
This creates a minimal 3D volume (multiple slices) in DICOM format.
"""

import numpy as np
import pydicom
from pydicom.dataset import Dataset, FileDataset
from pydicom.uid import generate_uid
import datetime
import os

def create_test_dicom_series(output_dir='test-data', num_slices=10):
    """Create a simple DICOM series with synthetic data."""
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate a unique series instance UID
    series_instance_uid = generate_uid()
    study_instance_uid = generate_uid()
    
    # Create synthetic 3D volume data (simple sphere)
    volume_size = (256, 256, num_slices)
    center = np.array([128, 128, num_slices/2])
    radius = 50
    
    for slice_idx in range(num_slices):
        # Create synthetic image data (circle that varies in size through slices)
        image = np.zeros((256, 256), dtype=np.uint16)
        
        # Calculate sphere cross-section at this slice
        z_dist = abs(slice_idx - center[2])
        if z_dist < radius:
            slice_radius = np.sqrt(radius**2 - z_dist**2)
            y, x = np.ogrid[:256, :256]
            mask = (x - center[0])**2 + (y - center[1])**2 <= slice_radius**2
            image[mask] = 1000  # Typical CT value for soft tissue
        
        # Add some noise
        noise = np.random.normal(0, 10, image.shape)
        image = np.clip(image + noise, 0, 4095).astype(np.uint16)
        
        # Create DICOM file
        file_meta = Dataset()
        file_meta.MediaStorageSOPClassUID = pydicom.uid.CTImageStorage
        file_meta.MediaStorageSOPInstanceUID = generate_uid()
        file_meta.TransferSyntaxUID = pydicom.uid.ExplicitVRLittleEndian
        
        # Create the FileDataset instance
        filename = os.path.join(output_dir, f"slice_{slice_idx:03d}.dcm")
        ds = FileDataset(
            filename,
            {},
            file_meta=file_meta,
            preamble=b"\0" * 128
        )
        
        # Add patient information
        ds.PatientName = "Test^Patient"
        ds.PatientID = "123456"
        ds.PatientBirthDate = "19800101"
        ds.PatientSex = "M"
        
        # Add study information
        ds.StudyInstanceUID = study_instance_uid
        ds.StudyDate = datetime.datetime.now().strftime("%Y%m%d")
        ds.StudyTime = datetime.datetime.now().strftime("%H%M%S.%f")[:-3]
        ds.StudyDescription = "Test DICOM Series"
        
        # Add series information
        ds.SeriesInstanceUID = series_instance_uid
        ds.SeriesNumber = 1
        ds.SeriesDescription = "Test CT Series"
        ds.Modality = "CT"
        
        # Add image information
        ds.InstanceNumber = slice_idx + 1
        ds.SliceThickness = 5.0
        ds.SliceLocation = slice_idx * 5.0
        ds.ImagePositionPatient = [0.0, 0.0, float(slice_idx * 5.0)]
        ds.ImageOrientationPatient = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0]
        ds.PixelSpacing = [1.0, 1.0]
        
        # Add pixel data
        ds.Rows = 256
        ds.Columns = 256
        ds.BitsAllocated = 16
        ds.BitsStored = 12
        ds.HighBit = 11
        ds.PixelRepresentation = 0
        ds.SamplesPerPixel = 1
        ds.PhotometricInterpretation = "MONOCHROME2"
        ds.PixelData = image.tobytes()
        
        # Add window/level settings
        ds.WindowCenter = 40
        ds.WindowWidth = 400
        
        # Save the file
        ds.save_as(filename, write_like_original=False)
        print(f"Created {filename}")
    
    print(f"\nCreated DICOM series with {num_slices} slices in {output_dir}/")
    return output_dir

if __name__ == "__main__":
    # Check if pydicom is installed
    try:
        import pydicom
    except ImportError:
        print("pydicom is not installed. Installing...")
        import subprocess
        subprocess.run(["pip", "install", "pydicom", "numpy"], check=True)
        import pydicom
    
    create_test_dicom_series()