# ApexRad Enterprise DICOM Web Viewer
# Radiologist & Clinical End-User Diagnostic Manual

## Table of Contents
1. Workstation Layout & Navigation
2. Modality Worklist (MWL) & Study Search
3. Image Manipulation & Calibration (Window/Level)
4. Diagnostic Measurements (Caliper, Cobb Angle, ROIs, HU Probe)
5. Multiplanar Reconstruction (MPR)
6. 3D Volume Rendering & Maximum Intensity Projection (MIP)
7. Cine Playback & Stack Scrolling
8. Structured Radiology Reporting & Digital Sign-off
9. DICOM Header Tag Inspector & De-Identification

---

## 1. Workstation Layout & Navigation
ApexRad provides a modern clinical interface:
- **Top Bar**: Patient name, MRN, age/sex, accession number, study description, critical finding alert badge, and view tabs (`Worklist`, `Viewer`, `Reports`, `PACS`, `Admin`, `Deploy`).
- **Layout Selector**: Instant switching between `1x1`, `1x2`, `2x1`, `2x2`, `MPR`, and `3D` viewports.
- **Diagnostic Toolbar**: Primary manipulation and caliper measurement tools.
- **Corner Overlays**: DICOM standard text overlays in the four corners showing patient info, study parameters, slice thickness, slice location, window/level, and pixel spacing.

---

## 2. Modality Worklist (MWL) & Study Search
1. Click **Worklist** in the navigation bar.
2. Search by Patient Name, Medical Record Number (MRN), Accession Number, or Exam Description.
3. Filter by modality (`ALL`, `CT`, `DX`, `MR`, `US`) or study workflow status (`Unreported`, `In Progress`, `Completed`, `Verified`).
4. Click any study row to preview its acquisition series thumbnails, or click **Open in Viewer**.
5. To load a local disk file, click **Upload .DCM** to parse any standard DICOM Part 10 file instantly in your browser without transmitting unencrypted data.

---

## 3. Image Manipulation & Calibration (Window/Level)
- **Window/Level Adjustment**: Select the **W/L** tool and drag horizontally on the image to adjust Window Width (contrast) or vertically to adjust Window Center (brightness).
- **Clinical Presets**: Click the preset dropdown to apply standard calibrations:
  - `CT Lung`: W: 1500, L: -600 (Airway and pulmonary parenchyma)
  - `CT Bone`: W: 1500, L: 300 (Cortical bone and skeletal trauma)
  - `CT Brain`: W: 80, L: 40 (Gray-white differentiation, acute ischemia)
  - `CT Subdural`: W: 150, L: 75 (Acute extra-axial hematoma)
  - `CT Soft Tissue`: W: 400, L: 50 (Abdomen, pelvis, musculature)
- **Image Transformations**: Rotate 90° CW/CCW, Flip Horizontal, Flip Vertical, and Invert Grayscale (Negative/Positive toggle).

---

## 4. Diagnostic Measurements & Annotations
- **Length / Caliper**: Click and drag between two anatomical points. Displays physical millimeters calculated from `PixelSpacing (0028,0030)`.
- **3-Point Angle**: Click 3 points (arm 1, vertex, arm 2) to calculate subtended angle in degrees.
- **Cobb Angle**: Click two endplate lines to calculate intersecting spinal curvature angle.
- **Rectangular & Elliptical ROIs**: Drag over a region of interest. Automatically samples all enclosed pixels to calculate Area ($\text{mm}^2$), Mean HU, Min HU, Max HU, and Standard Deviation ($\sigma$).
- **Point Probe**: Click any pixel to inspect its exact calibrated Hounsfield Unit (HU).
- **Annotations**: Place text callouts and pointer arrows.

---

## 5. Multiplanar Reconstruction (MPR)
Click **MPR** in the layout selector to enter synchronized 3-plane orthogonal review:
- **Axial (XY)**: Transverse slices from superior to inferior.
- **Coronal (XZ)**: Frontal slices with anatomical height scaled by true slice thickness.
- **Sagittal (YZ)**: Lateral slices from right to left.
- **Linked Dynamic Crosshairs**: Drag the crosshair in any view to update the perpendicular planes in real time.
- **Slab Thickness**: Select 1 mm (Native), 3 mm, 5 mm, or 10 mm with Average, MIP, or MinIP projection modes.

---

## 6. 3D Volume Rendering & Maximum Intensity Projection (MIP)
Click **3D** in the layout selector:
- **Orbit Camera**: Drag to rotate pitch and yaw.
- **Transfer Functions**: Switch between `CT Bone`, `Soft Tissue & Vessels`, `Angio MIP`, and `MinIP Airway`.
- **Clipping Planes**: Adjust the Axial and Coronal sliders to cut into deep cavities and inspect internal vascular structures.
- **3D Orientation Cube**: Displays anatomical orientation (R, A, S).

---

## 7. Cine Playback & Stack Scrolling
- **Mouse Wheel**: Scroll through slices or ultrasound frames.
- **Cine Player**: Click **Play Cine** on the toolbar to review dynamic motion.
- **Speed Controller**: Select frame rate from 5 to 30 FPS.

---

## 8. Structured Radiology Reporting & Digital Sign-off
1. Click **Reports** in the navigation bar.
2. Load a modality template (`CT Head Trauma`, `Chest Radiography`, `MRI Brain`).
3. Complete the clinical sections: Clinical History, Technique, Comparison, Findings, Impression, Recommendations.
4. If an emergent finding is present, toggle the **Critical Finding / STAT Alert** flag.
5. Click **Sign & Verify Report** to apply your digital signature.
6. Click **Print / PDF** to generate a clinical diagnostic report or **Copy** to paste into the hospital EHR.
