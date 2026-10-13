import cv2
import numpy as np
import glob
import os
import math

# =====================================================================================
# --- 1. SCRIPT CONFIGURATION ---
# =====================================================================================

# --- ArUco Marker Settings ---
# Dictionary defines the type of markers we're looking for (4x4 grid, 50 unique markers).
ARUCO_DICT = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
# The specific IDs of the four markers placed around the dartboard.
MARKER_IDS = [0, 1, 2, 3]
# Parameters for the ArUco detector. These are generally fine-tuned for robustness.
ARUCO_PARAMS = cv2.aruco.DetectorParameters()
ARUCO_PARAMS.adaptiveThreshWinSizeStep = 2
ARUCO_PARAMS.adaptiveThreshWinSizeMax = 23
ARUCO_PARAMS.adaptiveThreshConstant = 7
ARUCO_PARAMS.polygonalApproxAccuracyRate = 0.05

# --- Image Processing Settings ---
# The desired square dimensions (in pixels) of the final, rectified output image.
output_size = 800
# A virtual square that we will map the detected marker corners to.
DESTINATION_POINTS = np.array([
    [0, 0], [output_size - 1, 0],
    [output_size - 1, output_size - 1], [0, output_size - 1]
], dtype="float32")

# The folder containing the dartboard images to be processed.
IMAGE_FOLDER = "images"

# --- User-Tunable Parameters ---
# Expands the perspective warp area beyond the markers to prevent cropping the dartboard.
# A larger value "zooms out", a smaller value "zooms in".
DARTBOARD_PADDING = 100

# Manual correction for camera lens distortion. Adjust this if the final rectified
# dartboard still appears as a slight oval instead of a perfect circle.
# > 1.0 stretches vertically, < 1.0 squashes vertically.
ASPECT_RATIO_MANUAL_CORRECTION = 1.13

# --- Scoring Configuration ---
# These values MUST be measured from your "2. Rectified Reference Frame" window.
# They are the pixel distances (radii) from the center of the board (400, 400)
# to the OUTER EDGE of each scoring ring.
R_DOUBLE_BULL = 9      # Radius of the Double Bullseye (inner red circle)
R_SINGLE_BULL = 37     # Radius of the Single Bullseye (outer green circle)
R_TRIPLE_IN = 246      # Radius to the INNER edge of the triple ring
R_TRIPLE_OUT = 259     # Radius to the OUTER edge of the triple ring
R_DOUBLE_IN = 402      # Radius to the INNER edge of the double ring
R_DOUBLE_OUT = 429     # Radius to the OUTER edge of the double ring

# The standard scoring wedges on a dartboard, starting from the 3 o'clock
# position ('6') and moving counter-clockwise. DO NOT CHANGE THIS ORDER.
SCORE_WEDGES = [6, 13, 4, 18, 1, 20, 5, 12, 9, 14, 11, 8, 16, 7, 19, 3, 17, 2, 15, 10]


# =====================================================================================
# --- 2. GLOBAL VARIABLES ---
# =====================================================================================

# These variables store state between function calls.
reference_frame_rectified = None # The clean, rectified image of the empty board.
homography_matrix = None         # The transformation matrix used to warp the perspective.


# =====================================================================================
# --- 3. CORE FUNCTIONS ---
# =====================================================================================

def find_and_warp(frame):
    """
    Detects ArUco markers, calculates a perspective transform, and returns a top-down view.
    Includes aspect ratio correction to ensure the dartboard is a perfect circle.
    """
    global homography_matrix
    if frame is None:
        print("Error: Input frame is empty. Check image path.")
        return None, None

    # Pre-process the image for better marker detection.
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    gray_enhanced = clahe.apply(gray)

    # Detect markers in the enhanced grayscale image.
    corners, ids, rejected = cv2.aruco.detectMarkers(gray_enhanced, ARUCO_DICT, parameters=ARUCO_PARAMS)
    
    display_frame = frame.copy()
    if ids is not None:
        cv2.aruco.drawDetectedMarkers(display_frame, corners, ids)

    # If all four markers are found, calculate a new homography matrix.
    found_all_markers = False
    if ids is not None:
        marker_map = {id[0]: corner for id, corner in zip(ids, corners)}
        if all(marker_id in marker_map for marker_id in MARKER_IDS):
            print("Successfully detected all required markers. Calculating new perspective transform.")
            found_all_markers = True

            # Get the inner corners of the markers to define the source rectangle.
            tl_inner = marker_map[0][0][2]
            tr_inner = marker_map[1][0][3]
            br_inner = marker_map[3][0][0]
            bl_inner = marker_map[2][0][1]

            # Apply padding to expand the capture area.
            tl_padded = [tl_inner[0] - DARTBOARD_PADDING, tl_inner[1] - DARTBOARD_PADDING]
            tr_padded = [tr_inner[0] + DARTBOARD_PADDING, tr_inner[1] - DARTBOARD_PADDING]
            br_padded = [br_inner[0] + DARTBOARD_PADDING, br_inner[1] + DARTBOARD_PADDING]
            bl_padded = [bl_inner[0] - DARTBOARD_PADDING, bl_inner[1] + DARTBOARD_PADDING]
            src_points = np.array([tl_padded, tr_padded, br_padded, bl_padded], dtype="float32")
            
            # --- Aspect Ratio Correction Logic ---
            # Measure the dimensions of the source rectangle to prevent distortion.
            width_top = np.linalg.norm(src_points[0] - src_points[1])
            width_bottom = np.linalg.norm(src_points[3] - src_points[2])
            avg_width = (width_top + width_bottom) / 2
            height_left = np.linalg.norm(src_points[0] - src_points[3])
            height_right = np.linalg.norm(src_points[1] - src_points[2])
            avg_height = (height_left + height_right) / 2
            
            # Calculate the corrected aspect ratio, including the manual fine-tuning factor.
            aspect_ratio = avg_height / avg_width
            corrected_aspect_ratio = aspect_ratio * ASPECT_RATIO_MANUAL_CORRECTION
            
            # Create a new destination rectangle with the corrected proportions.
            new_height = int(output_size * corrected_aspect_ratio)
            y_offset = (output_size - new_height) // 2
            destination_points_corrected = np.array([
                [0, y_offset], [output_size - 1, y_offset],
                [output_size - 1, y_offset + new_height - 1], [0, y_offset + new_height - 1]
            ], dtype="float32")
            
            print(f"Applying manual correction. Final aspect ratio: {corrected_aspect_ratio:.3f}")
            homography_matrix = cv2.getPerspectiveTransform(src_points, destination_points_corrected)

    # If a matrix exists, warp the image. If not all markers were found, use the previous matrix.
    if homography_matrix is not None:
        if not found_all_markers:
            print("Warning: Did not find all markers. Applying PREVIOUS transform.")
        warped = cv2.warpPerspective(frame, homography_matrix, (output_size, output_size))
        cv2.imshow("Debug: Enhanced Grayscale", gray_enhanced)
        return warped, display_frame
    else:
        print("FATAL: Could not find markers in the first frame to establish a transform.")
        cv2.imshow("Debug: Enhanced Grayscale", gray_enhanced)
        return None, display_frame

def find_dart_tip(rectified_image):
    """
    Finds all dart tips by comparing the current frame to the reference frame.
    Returns a list of (x, y) coordinates for each detected dart tip.
    """
    if reference_frame_rectified is None:
        print("Error: Reference frame not set.")
        return [], None # Return an empty list if no reference exists.

    # Find the difference between the current frame and the empty board.
    diff = cv2.absdiff(reference_frame_rectified, rectified_image)
    gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)

    # Use adaptive thresholding to create a binary mask of the new objects (darts).
    blurred_diff = cv2.GaussianBlur(gray_diff, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blurred_diff, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2)
    thresh = cv2.bitwise_not(thresh)
    
    # Clean up the mask to remove noise and close holes in the dart shapes.
    kernel = np.ones((5,5), np.uint8)
    dilated = cv2.dilate(thresh, kernel, iterations=3)
    eroded = cv2.erode(dilated, kernel, iterations=3)

    # Find the contours of all detected objects.
    contours, _ = cv2.findContours(eroded, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Filter out contours that are too small to be darts.
    valid_contours = [c for c in contours if cv2.contourArea(c) > 150]
    
    tip_points = []
    if not valid_contours:
        return [], (diff, eroded) # Return empty list if no valid contours are found.

    # For each valid contour, find the point furthest from its center (the tip).
    for dart_contour in valid_contours:
        try:
            # Calculate the center of the dart contour.
            M = cv2.moments(dart_contour)
            if M["m00"] != 0:
                cX = int(M["m10"] / M["m00"])
                cY = int(M["m01"] / M["m00"])
            else:
                (cX, cY), _ = cv2.minEnclosingCircle(dart_contour)
            contour_center = (int(cX), int(cY))

            # Find the point on the contour edge that is farthest from this center.
            max_dist = -1
            tip_point = None
            for point in dart_contour:
                dist = np.linalg.norm(np.array(point[0]) - np.array(contour_center))
                if dist > max_dist:
                    max_dist = dist
                    tip_point = tuple(point[0])
            
            if tip_point:
                tip_points.append((int(tip_point[0]), int(tip_point[1])))
        except Exception as e:
            print(f"  -> Could not process a contour: {e}")
            continue
            
    return tip_points, (diff, eroded)

def get_score_from_tip(tip_point, output_size):
    """
    Calculates the dart score for a given tip coordinate using a polar coordinate system.
    Returns the integer score and a string description (e.g., "Triple 20").
    """
    center_x = output_size // 2
    center_y = output_size // 2

    # 1. Convert cartesian coordinates (x, y) to polar coordinates (radius, angle).
    dx = tip_point[0] - center_x
    dy = tip_point[1] - center_y
    radius = math.sqrt(dx**2 + dy**2)
    angle = math.degrees(math.atan2(-dy, dx)) # Use -dy because image y-axis is inverted.
    if angle < 0:
        angle += 360

    # 2. Determine score multiplier based on the RADIUS.
    multiplier = 1
    score_str_prefix = ""
    if radius <= R_DOUBLE_BULL:
        return 50, "Double Bull"
    elif radius <= R_SINGLE_BULL:
        return 25, "Single Bull"
    elif R_TRIPLE_IN <= radius <= R_TRIPLE_OUT:
        multiplier = 3
        score_str_prefix = "Triple"
    elif R_DOUBLE_IN <= radius <= R_DOUBLE_OUT:
        multiplier = 2
        score_str_prefix = "Double"
    elif radius > R_DOUBLE_OUT:
        return 0, "Miss"

    # 3. Determine the base score based on the ANGLE.
    # We shift the angle by 9 degrees to align it with the scoring wedge boundaries.
    adjusted_angle = (angle + 9) % 360
    wedge_index = int(adjusted_angle // 18) # Each wedge is 18 degrees.
    base_score = SCORE_WEDGES[wedge_index]
    
    # 4. Calculate final score and create the descriptive string.
    final_score = base_score * multiplier
    if score_str_prefix:
        score_description = f"{score_str_prefix} {base_score}"
    else:
        score_description = f"{base_score}"

    return final_score, score_description

# =====================================================================================
# --- 4. MAIN EXECUTION ---
# =====================================================================================
if __name__ == "__main__":
    # Load all JPG images from the specified folder.
    image_files = sorted(glob.glob(os.path.join(IMAGE_FOLDER, '*.jpg')))
    if not image_files:
        print(f"Error: No JPG images found in the '{IMAGE_FOLDER}' folder.")
    else:
        # Create resizable windows for displaying output.
        cv2.namedWindow("1. Marker Detection", cv2.WINDOW_NORMAL)
        cv2.namedWindow("Debug: Enhanced Grayscale", cv2.WINDOW_NORMAL)
        
        # --- Establish the Reference Frame ---
        # The first image is assumed to be of the empty dartboard.
        first_image_path = image_files[0]
        print(f"Processing reference image: {os.path.basename(first_image_path)}")
        frame = cv2.imread(first_image_path)
        reference_frame_rectified, display_frame = find_and_warp(frame)

        if display_frame is not None:
            cv2.imshow("1. Marker Detection", display_frame)
            print("Showing detection results. Press any key to continue...")
            cv2.waitKey(0)
        
        if reference_frame_rectified is not None:
            cv2.namedWindow("2. Rectified Reference Frame", cv2.WINDOW_NORMAL)
            print("Reference frame captured and warped successfully.")
            cv2.imshow("2. Rectified Reference Frame", reference_frame_rectified)
        else:
            print("\nFATAL: Could not establish a reference frame.")
            cv2.waitKey(0)
            exit()

        # --- Process Dart Images ---
        # Loop through the rest of the images, assuming they contain darts.
        for image_path in image_files[1:]:
            print(f"\nProcessing image: {os.path.basename(image_path)}")
            current_frame = cv2.imread(image_path)
            rectified_current, display_current = find_and_warp(current_frame)
            
            if rectified_current is not None:
                # 'tips' is now a list, which can contain multiple coordinates.
                tips, viz_images = find_dart_tip(rectified_current)
                diff_img, mask_img = viz_images
                final_result_img = rectified_current.copy()
                
                if tips: # Check if any darts were found.
                    total_score = 0
                    score_descriptions = []
                    
                    # Loop through each detected dart tip.
                    for i, tip in enumerate(tips):
                        print(f"  -> Dart {i+1} tip found at coordinates: {tip}")
                        
                        # Draw visuals for this specific tip.
                        cv2.circle(final_result_img, tip, 10, (0, 255, 0), -1)
                        cv2.putText(final_result_img, f"Tip: {tip}", (tip[0] + 15, tip[1] + 5), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

                        # Calculate score for this tip and add to totals.
                        score, text = get_score_from_tip(tip, output_size)
                        total_score += score
                        score_descriptions.append(text)
                    
                    # Display the final combined score for the throw.
                    print(f"  -> TOTAL SCORE: {total_score}")
                    display_text = f"Total: {total_score} ({' + '.join(score_descriptions)})"
                    cv2.putText(final_result_img, display_text, (20, 40), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 0), 2, cv2.LINE_AA)

                # Show all the processing windows.
                cv2.imshow("1. Marker Detection", display_current)
                cv2.imshow("4. Difference from Reference", diff_img)
                cv2.imshow("5. Dart Mask", mask_img)
                cv2.imshow("6. Final Result with Tip", final_result_img)
                print("Press any key to process the next image...")
                cv2.waitKey(0)

    print("\nAll images processed. Press any key to exit.")
    cv2.waitKey(0)
    cv2.destroyAllWindows()