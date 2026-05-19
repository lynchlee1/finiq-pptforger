import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import PizZip from 'pizzip';

export async function generatePpt(templatePath: string, outputPath: string, data: Record<string, any>) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  // Replace tags in all slide and note XMLs
  for (const key of Object.keys(zip.files)) {
    if ((key.startsWith('ppt/slides/slide') || key.startsWith('ppt/notesSlides/notesSlide')) && key.endsWith('.xml')) {
      let xml = zip.files[key].asText();
      
      for (const [k, v] of Object.entries(data)) {
        if (k === 'ownershipTableData') continue;
        if (k === 'call_percent') {
          xml = xml.replace(/X%/g, `${v}%`);
          continue;
        }
        if (k === 'refixing_percent') {
          xml = xml.replace(/Y%/g, `${v}%`);
          continue;
        }
        const placeholder = `{{${k}}}`;
        // Simple string replace. 
        // Note: PowerPoint sometimes splits text into different XML elements (runs).
        // The original python-pptx implementation also relied on the tag being intact within a run.
        // Therefore, this simple string replace perfectly replicates the previous behavior.
        xml = xml.split(placeholder).join(String(v));
      }
      
      if (data.ownershipTableData) {
        let currentPos = xml.indexOf('<a:tbl>');
        while (currentPos !== -1) {
          const tblEnd = xml.indexOf('</a:tbl>', currentPos);
          if (tblEnd === -1) break;
          
          const tblXml = xml.substring(currentPos, tblEnd + 8);
          if (tblXml.includes('특관자1') || tblXml.includes('주주명')) {
            let rowIndex = 0;
            const trRegex = new RegExp('<a:tr[^>]*>.*?</a:tr>', 'gs');
            const newTblXml = tblXml.replace(trRegex, (rowXml) => {
              if (rowIndex < 2 || rowIndex >= 12) {
                rowIndex++;
                return rowXml;
              }
              const r = rowIndex - 2;
              let cellIndex = 0;
              const tcRegex = new RegExp('<a:tc[^>]*>.*?</a:tc>', 'gs');
              const newRowXml = rowXml.replace(tcRegex, (cellXml) => {
                if (cellIndex >= 11) return cellXml;
                const cellData = data.ownershipTableData[r][cellIndex];
                let newCellXml = cellXml;
                
                if (cellData) {
                  if (newCellXml.includes('<a:t>')) {
                    const atRegex = new RegExp('<a:t>.*?</a:t>');
                    newCellXml = newCellXml.replace(atRegex, `<a:t>${cellData.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a:t>`);
                    const extraAtRegex = new RegExp('</a:t>.*?<a:t>.*?</a:t>', 's');
                    while(extraAtRegex.test(newCellXml)) {
                       newCellXml = newCellXml.replace(extraAtRegex, '</a:t>');
                    }
                    if (cellIndex > 0) {
                      // Add right alignment and margin to existing <a:pPr> or create one
                      if (newCellXml.includes('<a:pPr ')) {
                         newCellXml = newCellXml.replace(/<a:pPr /g, '<a:pPr algn="r" marR="10800" ');
                      } else if (newCellXml.includes('<a:pPr/>')) {
                         newCellXml = newCellXml.replace(/<a:pPr\/>/g, '<a:pPr algn="r" marR="10800"/>');
                      } else {
                         newCellXml = newCellXml.replace(/<a:p>/g, '<a:p><a:pPr algn="r" marR="10800"/>');
                         newCellXml = newCellXml.replace(/<a:p [^>]*>/g, (match) => `${match}<a:pPr algn="r" marR="10800"/>`);
                      }
                    }
                  } else if (newCellXml.includes('<a:p>')) {
                    const pPrTag = cellIndex > 0 ? '<a:pPr algn="r" marR="10800"/>' : '';
                    newCellXml = newCellXml.replace('<a:p>', `<a:p>${pPrTag}<a:r><a:rPr sz="1000"><a:latin typeface="맑은 고딕"/><a:ea typeface="맑은 고딕"/></a:rPr><a:t>${cellData.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a:t></a:r>`);
                  } else if (newCellXml.includes('<a:p ')) {
                     const apRegex = new RegExp('<a:p [^>]*>');
                     const pPrTag = cellIndex > 0 ? '<a:pPr algn="r" marR="10800"/>' : '';
                     newCellXml = newCellXml.replace(apRegex, (match) => `${match}${pPrTag}<a:r><a:rPr sz="1000"><a:latin typeface="맑은 고딕"/><a:ea typeface="맑은 고딕"/></a:rPr><a:t>${cellData.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a:t></a:r>`);
                  }
                } else {
                  const allAtRegex = new RegExp('<a:t>.*?</a:t>', 'gs');
                  newCellXml = newCellXml.replace(allAtRegex, "");
                }
                
                cellIndex++;
                return newCellXml;
              });
              
              rowIndex++;
              return newRowXml;
            });
            xml = xml.substring(0, currentPos) + newTblXml + xml.substring(tblEnd + 8);
            // Since we modified the xml length, re-search from the end of the new table
            currentPos = currentPos + newTblXml.length;
          } else {
            currentPos = tblEnd + 8;
          }
          currentPos = xml.indexOf('<a:tbl>', currentPos);
        }
      }
      
      zip.file(key, xml);
    }
  }

  const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outputPath, buf);
  
  return outputPath;
}
