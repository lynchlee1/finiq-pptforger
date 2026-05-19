import json
import os
import sys
import xml.etree.ElementTree as ET
from pptx import Presentation
from pptx.enum.dml import MSO_COLOR_TYPE, MSO_FILL, MSO_THEME_COLOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt
from pptx.oxml.ns import qn
from jsonschema import validate, ValidationError

ALIGN_MAP = {
    PP_ALIGN.LEFT: "LEFT",
    PP_ALIGN.CENTER: "CENTER",
    PP_ALIGN.RIGHT: "RIGHT",
    PP_ALIGN.JUSTIFY: "JUSTIFY"
}

DEFAULT_THEME_COLORS = {
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
        self.theme_colors = DEFAULT_THEME_COLORS.copy()

    def _extract_theme_colors(self, prs):
        """Extracts actual theme colors from the PPTX file."""
        self.theme_colors = DEFAULT_THEME_COLORS.copy()
        try:
            theme_part = None
            for rel in prs.part.rels.values():
                if "theme" in rel.reltype:
                    theme_part = rel.target_part
                    break
            if not theme_part and prs.slide_masters:
                for rel in prs.slide_masters[0].part.rels.values():
                    if "theme" in rel.reltype:
                        theme_part = rel.target_part
                        break
            if not theme_part: return

            theme_xml = theme_part.blob
            root = ET.fromstring(theme_xml)
            ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
            clr_scheme = root.find('.//a:clrScheme', ns)
            if clr_scheme is not None:
                mapping = {
                    'dk1': MSO_THEME_COLOR.TEXT_1, 'lt1': MSO_THEME_COLOR.BACKGROUND_1,
                    'dk2': MSO_THEME_COLOR.TEXT_2, 'lt2': MSO_THEME_COLOR.BACKGROUND_2,
                    'accent1': MSO_THEME_COLOR.ACCENT_1, 'accent2': MSO_THEME_COLOR.ACCENT_2,
                    'accent3': MSO_THEME_COLOR.ACCENT_3, 'accent4': MSO_THEME_COLOR.ACCENT_4,
                    'accent5': MSO_THEME_COLOR.ACCENT_5, 'accent6': MSO_THEME_COLOR.ACCENT_6,
                    'hlink': MSO_THEME_COLOR.HYPERLINK, 'folHlink': MSO_THEME_COLOR.FOLLOWED_HYPERLINK,
                }
                for color_node in clr_scheme:
                    name = color_node.tag.split('}')[-1]
                    if name in mapping:
                        srgb_clr = color_node.find('.//a:srgbClr', ns)
                        if srgb_clr is not None:
                            val = srgb_clr.get('val')
                            self.theme_colors[mapping[name]] = f"#{val}"
                        else:
                            sys_clr = color_node.find('.//a:sysClr', ns)
                            if sys_clr is not None and sys_clr.get('lastClr'):
                                self.theme_colors[mapping[name]] = f"#{sys_clr.get('lastClr')}"
        except Exception as e:
            sys.stderr.write(f"Warning: Failed to extract theme colors: {e}\n")

    def _apply_brightness(self, hex_color, brightness):
        try:
            if not hex_color or brightness == 0: return hex_color
            color = hex_color.lstrip('#')
            if len(color) != 6: return hex_color
            r, g, b = int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16)
            if brightness > 0:
                r = int(r + (255 - r) * brightness)
                g = int(g + (255 - g) * brightness)
                b = int(b + (255 - b) * brightness)
            else:
                r = int(r * (1 + brightness))
                g = int(g * (1 + brightness))
                b = int(b * (1 + brightness))
            return f"#{max(0, min(255, r)):02X}{max(0, min(255, g)):02X}{max(0, min(255, b)):02X}"
        except: return hex_color

    def _get_color_hex(self, color_obj):
        try:
            hex_val = None
            if color_obj.type == MSO_COLOR_TYPE.RGB:
                hex_val = f"#{str(color_obj.rgb)}"
            elif color_obj.type == MSO_COLOR_TYPE.SCHEME:
                hex_val = self.theme_colors.get(color_obj.theme_color)
            if hex_val and hasattr(color_obj, 'brightness') and color_obj.brightness != 0:
                hex_val = self._apply_brightness(hex_val, color_obj.brightness)
            return hex_val
        except: return None

    def _flatten_color(self, color_obj):
        try:
            if color_obj.type == MSO_COLOR_TYPE.SCHEME or (
                color_obj.type == MSO_COLOR_TYPE.RGB and 
                hasattr(color_obj, 'brightness') and color_obj.brightness != 0
            ):
                hex_val = self._get_color_hex(color_obj)
                if hex_val:
                    r, g, b = int(hex_val[1:3], 16), int(hex_val[3:5], 16), int(hex_val[5:7], 16)
                    color_obj.rgb = RGBColor(r, g, b)
                    if hasattr(color_obj, 'brightness'): color_obj.brightness = 0
        except: pass

    def _flatten_all_colors(self, prs):
        for master in prs.slide_masters:
            self._flatten_shapes_recursive(master.shapes)
            for layout in master.slide_layouts: self._flatten_shapes_recursive(layout.shapes)
        for slide in prs.slides:
            self._flatten_shapes_recursive(slide.shapes)
            try:
                if slide.background.fill.type == MSO_FILL.SOLID:
                    self._flatten_color(slide.background.fill.fore_color)
            except: pass

    def _flatten_shapes_recursive(self, shapes):
        for shape in shapes:
            try:
                if hasattr(shape, 'fill') and shape.fill.type == MSO_FILL.SOLID:
                    self._flatten_color(shape.fill.fore_color)
            except: pass
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    for run in paragraph.runs: self._flatten_color(run.font.color)
            if shape.has_table:
                self._style_table(shape.table)
            if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
                self._flatten_shapes_recursive(shape.shapes)

    def _get_fill_color(self, fill):
        try:
            if fill.type == MSO_FILL.SOLID: return self._get_color_hex(fill.fore_color)
            return None
        except: return None

    def validate_json(self, data):
        try:
            validate(instance=data, schema=self.schema)
            return True, ""
        except ValidationError as e: return False, str(e)

    def _resolve_template_path(self, path):
        if os.path.isdir(path):
            pptx_files = [f for f in os.listdir(path) if f.endswith('.pptx') and not f.startswith('~$')]
            if not pptx_files: return path
            dir_name = os.path.basename(path.rstrip(os.sep))
            for f in pptx_files:
                if os.path.splitext(f)[0].lower() == dir_name.lower(): return os.path.join(path, f)
            for f in pptx_files:
                if f.lower() == 'deal-summary.pptx': return os.path.join(path, f)
            return os.path.join(path, pptx_files[0])
        return path

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

        template_path = self._resolve_template_path(data['template'])
        if not os.path.exists(template_path):
            sys.stderr.write(f"Template not found: {template_path}\n")
            return False

        if output_pptx_path is None:
            output_pptx_path = f"generated_{os.path.basename(template_path)}"

        try:
            prs = Presentation(template_path)
            self._extract_theme_colors(prs)
            
            for slide_data in data['slides']:
                slide_index = slide_data['slide_index']
                if slide_index < 0 or slide_index >= len(prs.slides): continue
                slide = prs.slides[slide_index]
                self._process_slide(slide, slide_data)

            self._flatten_all_colors(prs)
            prs.save(output_pptx_path)
            print(json.dumps({"success": True, "path": os.path.abspath(output_pptx_path)}))
            return True
        except Exception as e:
            sys.stderr.write(f"Error during PPTX generation: {e}\n")
            return False

    def _process_slide(self, slide, slide_data):
        for key, value in slide_data.items():
            if key == 'slide_index': continue
            placeholder = f"{{{{{key}}}}}"
            self._replace_text_in_shapes(slide.shapes, placeholder, str(value))
        self._apply_global_styling(slide.shapes)

    def _apply_global_styling(self, shapes):
        for shape in shapes:
            if shape.has_table: self._style_table(shape.table)
            if shape.shape_type == MSO_SHAPE_TYPE.GROUP: self._apply_global_styling(shape.shapes)

    def _set_font_all_languages(self, font, font_name):
        try:
            font.name = font_name
            rPr = font._element
            ea = rPr.find(qn('a:ea'))
            if ea is None:
                from pptx.oxml.xmlchemy import OxmlElement
                ea = OxmlElement('a:ea')
                rPr.insert(0, ea)
            ea.set('typeface', font_name)
        except: pass

    def _style_table(self, table):
        try:
            table.first_row = False
            table.first_col = False
            table.horz_banding = False
            table.vert_banding = False
        except: pass
        try: self._fix_table_borders(table)
        except: pass
        try:
            tbl = table._tbl
            tblPr = tbl.find(qn('a:tblPr'))
            if tblPr is not None:
                tsId = tblPr.find(qn('a:tableStyleId'))
                if tsId is not None: tblPr.remove(tsId)
        except: pass

        for row in table.rows:
            for cell in row.cells:
                cell.margin_left = Inches(0.05)
                cell.margin_right = Inches(0.05)
                cell.margin_top = Inches(0.05)
                cell.margin_bottom = Inches(0.05)
                try:
                    if cell.fill.type == MSO_FILL.SOLID: self._flatten_color(cell.fill.fore_color)
                    else:
                        cell.fill.solid()
                        cell.fill.fore_color.rgb = RGBColor(255, 255, 255)
                except: pass
                if cell.text_frame:
                    for paragraph in cell.text_frame.paragraphs:
                        for run in paragraph.runs: self._flatten_color(run.font.color)

    def _fix_table_borders(self, table):
        for row in table.rows:
            for cell in row.cells:
                tcPr = cell._tc.get_or_add_tcPr()
                for side in ['lnT', 'lnB', 'lnL', 'lnR']:
                    ln = tcPr.find(qn(f'a:{side}'))
                    if ln is None:
                        from pptx.oxml.xmlchemy import OxmlElement
                        ln = OxmlElement(f'a:{side}')
                        ln.set('w', '12700')
                        tcPr.append(ln)
                    solidFill = ln.find(qn('a:solidFill'))
                    if solidFill is not None: ln.remove(solidFill)
                    from pptx.oxml.xmlchemy import OxmlElement
                    solidFill = OxmlElement('a:solidFill')
                    srgbClr = OxmlElement('a:srgbClr')
                    srgbClr.set('val', 'BFBFBF')
                    solidFill.append(srgbClr)
                    ln.append(solidFill)

    def _replace_text_in_shapes(self, shapes, placeholder, value):
        for shape in shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    for run in paragraph.runs:
                        if placeholder in run.text:
                            orig_font_name = run.font.name
                            orig_font_size = run.font.size
                            orig_bold = run.font.bold
                            run.text = run.text.replace(placeholder, value)
                            if orig_font_name: self._set_font_all_languages(run.font, orig_font_name)
                            if orig_font_size: run.font.size = orig_font_size
                            if orig_bold is not None: run.font.bold = orig_bold
            if shape.has_table:
                for row in shape.table.rows:
                    for cell in row.cells:
                        if cell.text_frame:
                            for paragraph in cell.text_frame.paragraphs:
                                for run in paragraph.runs:
                                    if placeholder in run.text:
                                        orig_font_name = run.font.name
                                        orig_font_size = run.font.size
                                        orig_bold = run.font.bold
                                        run.text = run.text.replace(placeholder, value)
                                        if orig_font_name: self._set_font_all_languages(run.font, orig_font_name)
                                        if orig_font_size: run.font.size = orig_font_size
                                        if orig_bold is not None: run.font.bold = orig_bold
            if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
                self._replace_text_in_shapes(shape.shapes, placeholder, value)

    def scan_template(self, template_path):
        template_path = self._resolve_template_path(template_path)
        if not os.path.exists(template_path): return False
        import re
        pattern = re.compile(r'\{\{([^}]+)\}\}')
        slides_info = []
        try:
            prs = Presentation(template_path)
            self._extract_theme_colors(prs)
            slide_width, slide_height = prs.slide_width, prs.slide_height
            for i, slide in enumerate(prs.slides):
                elements = []
                bg_color = self._get_fill_color(slide.background.fill) if hasattr(slide, 'background') else None
                try: self._extract_geometry_from_shapes(slide.slide_layout.slide_master.shapes, pattern, elements)
                except: pass
                try: self._extract_geometry_from_shapes(slide.slide_layout.shapes, pattern, elements)
                except: pass
                self._extract_geometry_from_shapes(slide.shapes, pattern, elements)
                slide_keys = {p for el in elements if el.get('placeholders') for p in el['placeholders']}
                slides_info.append({"slide_index": i, "background_color": bg_color, "keys": list(slide_keys), "elements": elements})
            print(json.dumps({"slide_count": len(prs.slides), "slide_width": slide_width, "slide_height": slide_height, "slides": slides_info}))
            return True
        except: return False

    def _extract_geometry_from_shapes(self, shapes, pattern, elements):
        for shape in shapes:
            try: left, top, width, height = shape.left, shape.top, shape.width, shape.height
            except: continue
            fill_color = self._get_fill_color(shape.fill) if hasattr(shape, 'fill') else None
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    text = paragraph.text.strip()
                    if not text: continue
                    font_size, text_color, is_bold = None, None, False
                    if paragraph.runs:
                        run = paragraph.runs[0]
                        font_size, text_color, is_bold = run.font.size, self._get_color_hex(run.font.color), run.font.bold
                    matches = list(pattern.finditer(text))
                    el = {"left": left, "top": top, "width": width, "height": height, "font_size": font_size, "text_color": text_color, "fill_color": fill_color, "is_bold": is_bold, "alignment": ALIGN_MAP.get(paragraph.alignment, "LEFT") if paragraph.alignment else "LEFT"}
                    if matches:
                        el["type"], el["original_text"], el["placeholders"] = "placeholder_container", text, [m.group(1) for m in matches]
                    else:
                        el["type"], el["text"] = "static", text
                    elements.append(el)
            elif shape.has_table:
                table_el = {"type": "table", "left": left, "top": top, "width": width, "height": height, "rows": []}
                for r_idx, row in enumerate(shape.table.rows):
                    row_data = {"height": row.height, "cells": []}
                    for c_idx, cell in enumerate(row.cells):
                        cell_info = {"left": left, "top": top, "width": shape.table.columns[c_idx].width, "height": row.height, "text": cell.text.strip(), "fill_color": self._get_fill_color(cell.fill) if hasattr(cell, 'fill') else None}
                        matches = list(pattern.finditer(cell.text))
                        if matches:
                            cell_info["type"], cell_info["placeholders"] = "placeholder_container", [m.group(1) for m in matches]
                        else: cell_info["type"] = "static"
                        row_data["cells"].append(cell_info)
                    table_el["rows"].append(row_data)
                elements.append(table_el)
            elif shape.shape_type == MSO_SHAPE_TYPE.GROUP: self._extract_geometry_from_shapes(shape.shapes, pattern, elements)
            elif shape.shape_type == 9: elements.append({"type": "line", "left": left, "top": top, "width": width, "height": height, "stroke_color": self._get_color_hex(shape.line.color) if hasattr(shape, 'line') else "#000000"})
            elif fill_color: elements.append({"type": "shape", "left": left, "top": top, "width": width, "height": height, "fill_color": fill_color})

def main():
    if len(sys.argv) < 2: sys.exit(1)
    command = sys.argv[1]
    current_dir = os.path.dirname(os.path.abspath(__file__))
    schema_file = os.path.join(current_dir, "../../shared/schema.json")
    generator = PPTGenerator(schema_file)
    if command == "generate": generator.generate(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    elif command == "scan": generator.scan_template(sys.argv[2])
    else: generator.generate(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)

if __name__ == "__main__": main()
