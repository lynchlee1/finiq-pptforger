import json
import os
import sys
from pptx import Presentation
from pptx.enum.dml import MSO_COLOR_TYPE, MSO_FILL
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.enum.text import PP_ALIGN
from jsonschema import validate, ValidationError

ALIGN_MAP = {
    PP_ALIGN.LEFT: "LEFT",
    PP_ALIGN.CENTER: "CENTER",
    PP_ALIGN.RIGHT: "RIGHT",
    PP_ALIGN.JUSTIFY: "JUSTIFY"
}

from pptx.enum.dml import MSO_COLOR_TYPE, MSO_FILL, MSO_THEME_COLOR

THEME_COLORS = {
    MSO_THEME_COLOR.BACKGROUND_1: "#FFFFFF",
    MSO_THEME_COLOR.TEXT_1: "#000000",
    MSO_THEME_COLOR.BACKGROUND_2: "#E7E6E6",
    MSO_THEME_COLOR.TEXT_2: "#44546A",
    MSO_THEME_COLOR.ACCENT_1: "#4472C4",
    MSO_THEME_COLOR.ACCENT_2: "#ED7D31",
    MSO_THEME_COLOR.ACCENT_3: "#A5A5A5",
    MSO_THEME_COLOR.ACCENT_4: "#FFC000",
    MSO_THEME_COLOR.ACCENT_5: "#5B9BD5",
    MSO_THEME_COLOR.ACCENT_6: "#70AD47",
    MSO_THEME_COLOR.HYPERLINK: "#0563C1",
    MSO_THEME_COLOR.FOLLOWED_HYPERLINK: "#954F72"
}

class PPTGenerator:
    def __init__(self, schema_path):
        with open(schema_path, 'r', encoding='utf-8') as f:
            self.schema = json.load(f)

    def _get_color_hex(self, color_obj):
        try:
            if color_obj.type == MSO_COLOR_TYPE.RGB:
                return f"#{str(color_obj.rgb)}"
            if color_obj.type == MSO_COLOR_TYPE.THEME:
                return THEME_COLORS.get(color_obj.theme_color)
            return None
        except:
            return None

    def _get_fill_color(self, fill):
        try:
            if fill.type == MSO_FILL.SOLID:
                return self._get_color_hex(fill.fore_color)
            return None
        except:
            return None

    def validate_json(self, data):
        try:
            validate(instance=data, schema=self.schema)
            return True, ""
        except ValidationError as e:
            return False, str(e)

    def generate(self, input_json_path, output_pptx_path=None):
        try:
            with open(input_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            sys.stderr.write(f"Error loading JSON: {e}\n")
            return False

        is_valid, error_msg = self.validate_json(data)
        if not is_valid:
            sys.stderr.write(f"JSON Validation Error: {error_msg}\n")
            return False

        template_path = data['template']
        if not os.path.exists(template_path):
            sys.stderr.write(f"Template not found: {template_path}\n")
            return False

        if output_pptx_path is None:
            output_pptx_path = f"generated_{os.path.basename(template_path)}"

        try:
            prs = Presentation(template_path)
            
            for slide_data in data['slides']:
                slide_index = slide_data['slide_index']
                if slide_index < 0 or slide_index >= len(prs.slides):
                    sys.stderr.write(f"Warning: slide_index {slide_index} out of range. Skipping.\n")
                    continue
                
                slide = prs.slides[slide_index]
                self._process_slide(slide, slide_data)

            prs.save(output_pptx_path)
            # Only print JSON to stdout
            print(json.dumps({"success": True, "path": os.path.abspath(output_pptx_path)}))
            return True
        except Exception as e:
            sys.stderr.write(f"Error during PPTX generation: {e}\n")
            return False

    def _process_slide(self, slide, slide_data):
        for key, value in slide_data.items():
            if key == 'slide_index':
                continue
            
            placeholder = f"{{{{{key}}}}}"
            self._replace_text_in_shapes(slide.shapes, placeholder, str(value))

    def _replace_text_in_shapes(self, shapes, placeholder, value):
        for shape in shapes:
            # 1. Handle shapes with text frames (Text boxes, AutoShapes)
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    for run in paragraph.runs:
                        if placeholder in run.text:
                            run.text = run.text.replace(placeholder, value)
            
            # 2. Handle tables
            if shape.has_table:
                for row in shape.table.rows:
                    for cell in row.cells:
                        if cell.text_frame:
                            for paragraph in cell.text_frame.paragraphs:
                                for run in paragraph.runs:
                                    if placeholder in run.text:
                                        run.text = run.text.replace(placeholder, value)
            
            # 3. Handle group shapes (recursive)
            if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
                self._replace_text_in_shapes(shape.shapes, placeholder, value)

    def scan_template(self, template_path):
        """Scans a PPTX file and returns detailed slide content with geometry for high-fidelity preview."""
        if not os.path.exists(template_path):
            print(json.dumps({"error": f"Template not found: {template_path}"}))
            return False

        import re
        pattern = re.compile(r'\{\{([^}]+)\}\}')
        
        slides_info = []

        try:
            prs = Presentation(template_path)
            # Slide dimensions in EMUs
            slide_width = prs.slide_width
            slide_height = prs.slide_height

            for i, slide in enumerate(prs.slides):
                elements = []
                
                # Try to get background color
                bg_color = None
                try:
                    bg_color = self._get_fill_color(slide.background.fill)
                except:
                    pass

                # 1. Scan Master shapes
                try:
                    self._extract_geometry_from_shapes(slide.slide_layout.slide_master.shapes, pattern, elements)
                except:
                    pass
                
                # 2. Scan Layout shapes
                try:
                    self._extract_geometry_from_shapes(slide.slide_layout.shapes, pattern, elements)
                except:
                    pass

                # 3. Scan Slide shapes
                self._extract_geometry_from_shapes(slide.shapes, pattern, elements)
                
                slide_keys = set()
                for el in elements:
                    if el.get('placeholders'):
                        for p in el['placeholders']:
                            slide_keys.add(p)

                slides_info.append({
                    "slide_index": i,
                    "background_color": bg_color,
                    "keys": list(slide_keys),
                    "elements": elements
                })
            
            all_keys = set()
            for s in slides_info:
                for k in s["keys"]:
                    all_keys.add(k)

            print(json.dumps({
                "slide_count": len(prs.slides),
                "slide_width": slide_width,
                "slide_height": slide_height,
                "slides": slides_info,
                "all_keys": list(all_keys)
            }))
            return True
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            return False

    def _extract_geometry_from_shapes(self, shapes, pattern, elements):
        for shape in shapes:
            # Common properties
            try:
                left = shape.left
                top = shape.top
                width = shape.width
                height = shape.height
            except:
                continue

            # Get shape fill color
            fill_color = None
            try:
                if hasattr(shape, 'fill'):
                    fill_color = self._get_fill_color(shape.fill)
            except:
                pass

            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    text = paragraph.text.strip()
                    if not text:
                        continue
                    
                    # Try to get font properties from the first run
                    font_size = None
                    text_color = None
                    is_bold = False
                    if len(paragraph.runs) > 0:
                        run = paragraph.runs[0]
                        if run.font.size:
                            font_size = run.font.size
                        text_color = self._get_color_hex(run.font.color)
                        is_bold = run.font.bold
                    
                    if not font_size and paragraph.font and paragraph.font.size:
                        font_size = paragraph.font.size
                    
                    if not is_bold and paragraph.font and paragraph.font.bold:
                        is_bold = True

                    # Handle bullet points
                    bullet = None
                    try:
                        level = paragraph.level
                        # This is a bit simplified, but helps
                        if level >= 0:
                            # Usually 0 is first level
                            bullet = "• " if level == 0 else "  - "
                    except:
                        pass

                    matches = list(pattern.finditer(text))
                    el = {
                        "left": left,
                        "top": top,
                        "width": width,
                        "height": height,
                        "font_size": font_size,
                        "text_color": text_color,
                        "fill_color": fill_color,
                        "is_bold": is_bold,
                        "bullet": bullet,
                        "alignment": ALIGN_MAP.get(paragraph.alignment, "LEFT") if paragraph.alignment else "LEFT"
                    }

                    if matches:
                        el["type"] = "placeholder_container"
                        el["original_text"] = text
                        el["placeholders"] = [m.group(1) for m in matches]
                    else:
                        el["type"] = "static"
                        el["text"] = text
                    
                    elements.append(el)
            
            elif shape.has_table:
                # Table itself is an element
                table_el = {
                    "type": "table",
                    "left": left,
                    "top": top,
                    "width": width,
                    "height": height,
                    "rows": []
                }
                
                current_top = top
                for r_idx, row in enumerate(shape.table.rows):
                    row_data = {"height": row.height, "cells": []}
                    current_left = left
                    for c_idx, cell in enumerate(row.cells):
                        col_width = shape.table.columns[c_idx].width
                        cell_text = cell.text.strip()
                        
                        # Basic merged cell detection: if cell is the same as previous, it might be merged
                        # python-pptx represents merged cells by having the same _Cell object
                        # We can check if it's the anchor of a merge
                        is_merged = False
                        try:
                            # If it's not the top-left cell of a merged range, it's "part" of a merge
                            # We'll just check if it's the same object as its neighbors
                            if r_idx > 0 and shape.table.cell(r_idx-1, c_idx) == cell:
                                is_merged = True
                            if c_idx > 0 and shape.table.cell(r_idx, c_idx-1) == cell:
                                is_merged = True
                        except:
                            pass

                        if is_merged:
                            row_data["cells"].append({"type": "merged_placeholder"})
                            current_left += col_width
                            continue

                        cell_info = {
                            "left": current_left,
                            "top": current_top,
                            "width": col_width,
                            "height": row.height,
                            "text": cell_text,
                        }

                        # Get cell fill color
                        try:
                            cell_info["fill_color"] = self._get_fill_color(cell.fill)
                        except:
                            pass
                        
                        if cell.text_frame:
                            matches = list(pattern.finditer(cell_text))
                            if matches:
                                cell_info["type"] = "placeholder_container"
                                cell_info["original_text"] = cell_text
                                cell_info["placeholders"] = [m.group(1) for m in matches]
                            else:
                                cell_info["type"] = "static"
                            
                            # Get font info from cell
                            if len(cell.text_frame.paragraphs) > 0:
                                p = cell.text_frame.paragraphs[0]
                                cell_info["is_bold"] = p.font.bold
                                if len(p.runs) > 0:
                                    cell_info["text_color"] = self._get_color_hex(p.runs[0].font.color)
                                    cell_info["font_size"] = p.runs[0].font.size
                                    if p.runs[0].font.bold:
                                        cell_info["is_bold"] = True
                        
                        row_data["cells"].append(cell_info)
                        current_left += col_width
                    
                    table_el["rows"].append(row_data)
                    current_top += row.height
                
                elements.append(table_el)

            elif shape.shape_type == MSO_SHAPE_TYPE.GROUP:
                self._extract_geometry_from_shapes(shape.shapes, pattern, elements)
            
            elif shape.shape_type == 9: # Line
                elements.append({
                    "type": "line",
                    "left": left,
                    "top": top,
                    "width": width,
                    "height": height,
                    "stroke_color": self._get_color_hex(shape.line.color) if hasattr(shape, 'line') else "#000000"
                })

            elif fill_color:
                # Even if it doesn't have text, if it has a fill color, it's a visual element
                elements.append({
                    "type": "shape",
                    "left": left,
                    "top": top,
                    "width": width,
                    "height": height,
                    "fill_color": fill_color
                })


    def _extract_keys_from_shapes(self, shapes, pattern, keys):
        for shape in shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    for run in paragraph.runs:
                        matches = pattern.findall(run.text)
                        for match in matches:
                            keys.add(match)
            if shape.has_table:
                for row in shape.table.rows:
                    for cell in row.cells:
                        if cell.text_frame:
                            for paragraph in cell.text_frame.paragraphs:
                                for run in paragraph.runs:
                                    matches = pattern.findall(run.text)
                                    for match in matches:
                                        keys.add(match)
            if shape.shape_type == 6: # Group shape
                self._extract_keys_from_shapes(shape.shapes, pattern, keys)

def main():
    if len(sys.argv) < 2:
        sys.exit(1)

    command = sys.argv[1]
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    schema_file = os.path.join(current_dir, "../../shared/schema.json")
    generator = PPTGenerator(schema_file)

    if command == "generate":
        input_json = sys.argv[2]
        output_pptx = sys.argv[3] if len(sys.argv) > 3 else None
        generator.generate(input_json, output_pptx)
    elif command == "scan":
        template_pptx = sys.argv[2]
        generator.scan_template(template_pptx)
    else:
        # Backward compatibility
        input_json = sys.argv[1]
        output_pptx = sys.argv[2] if len(sys.argv) > 2 else None
        generator.generate(input_json, output_pptx)

if __name__ == "__main__":
    main()
