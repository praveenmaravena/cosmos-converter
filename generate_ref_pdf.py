import fitz

def generate_pdf():
    doc = fitz.open()

    # Page 1: Cover Page
    page1 = doc.new_page()
    # Draw dark purple/teal banner line
    page1.draw_line(fitz.Point(50, 45), fitz.Point(550, 45), color=(0.4, 0.15, 0.65), width=4)
    
    # Title & Subtitle
    page1.insert_text(fitz.Point(50, 120), "COSMOS CONVERT", fontsize=32, color=(0.4, 0.15, 0.65), fontname="hebo")
    page1.insert_text(fitz.Point(50, 155), "The Ultimate Document & File Conversion Suite", fontsize=15, color=(0.05, 0.55, 0.55), fontname="hebo")
    
    # Description block
    desc_lines = [
        "A premium SaaS and desktop platform comparable to Adobe Acrobat, Notion, and Canva.",
        "Engineered with Next.js 15, FastAPI, Celery, Redis, SQLite/PostgreSQL, and Tauri.",
        "Designed to process secure multi-format conversions, OCR extractions, and document styling."
    ]
    y_pos = 200
    for line in desc_lines:
        page1.insert_text(fitz.Point(50, y_pos), line, fontsize=10, color=(0.25, 0.25, 0.25), fontname="helv")
        y_pos += 18

    # Details
    page1.insert_text(fitz.Point(50, 320), "CORE CAPABILITIES INCLUDED:", fontsize=12, color=(0.4, 0.15, 0.65), fontname="hebo")
    capabilities = [
        "- Dynamic multi-format converter (PDF, DOCX, HTML, TXT, PNG, JPG, WEBP)",
        "- Advanced PDF Toolbox (Merge, Watermark, Split, Protect, Decrypt, Rotate, Delete pages)",
        "- AI OCR invoice parsing and business card extraction",
        "- Interactive TipTap document rich text editor",
        "- Stellar Image Editor sandbox with cosmic filters and crop bounds",
        "- Multi-language system with flags (22 languages and RTL support)",
        "- Galaxy theme backdrop visual settings (twinkling starfields, animated nebulae)"
    ]
    y_pos = 350
    for cap in capabilities:
        page1.insert_text(fitz.Point(50, y_pos), cap, fontsize=10, color=(0.15, 0.15, 0.15), fontname="helv")
        y_pos += 20

    # Draw bottom accent line
    page1.draw_line(fitz.Point(50, 700), fitz.Point(550, 700), color=(0.05, 0.55, 0.55), width=2)
    page1.insert_text(fitz.Point(50, 725), "Cosmos Convert - Production Ready SaaS Manual", fontsize=9, color=(0.5, 0.5, 0.5), fontname="helv")

    # Page 2: Architecture & Setup
    page2 = doc.new_page()
    page2.insert_text(fitz.Point(50, 60), "1. SYSTEM ARCHITECTURE & DEPLOYMENT", fontsize=16, color=(0.4, 0.15, 0.65), fontname="hebo")
    page2.draw_line(fitz.Point(50, 75), fitz.Point(550, 75), color=(0.8, 0.8, 0.8), width=1)

    arch_sections = [
        ("FastAPI Backend Microservice:", "Serves REST API endpoints on port 8000. Utilizes SQLite in development for zero-dependency local setups, and automatically scales to PostgreSQL in production environments. CORS configuration enables communication from web browsers and Tauri desktop wrappers alike."),
        ("Celery Async Task Queue:", "Handles compute-heavy document modifications in background threads to protect connection timeouts. Redis acts as the broker and task cache queue. If Redis is down, backend gracefully falls back to local synchronous execution."),
        ("Next.js 15 Web Portal:", "Runs a premium client-side workspace on port 3000. Bootstrapped with Tailwind CSS, Framer Motion, and TipTap modules. Build configurations compile static assets for offline desktop apps."),
        ("Tauri Executable Wrapper:", "Packages static web assets into highly optimized, native desktop apps (EXE, DMG, AppImage) with low memory footprints.")
    ]
    
    y_pos = 100
    for title, text in arch_sections:
        page2.insert_text(fitz.Point(50, y_pos), title, fontsize=11, color=(0.05, 0.55, 0.55), fontname="hebo")
        y_pos += 15
        
        # Word wrap description text manually
        words = text.split()
        line = ""
        for word in words:
            if len(line + " " + word) > 85:
                page2.insert_text(fitz.Point(50, y_pos), line, fontsize=9.5, color=(0.2, 0.2, 0.2), fontname="helv")
                y_pos += 14
                line = word
            else:
                line += " " + word if line else word
        if line:
            page2.insert_text(fitz.Point(50, y_pos), line, fontsize=9.5, color=(0.2, 0.2, 0.2), fontname="helv")
            y_pos += 14
        y_pos += 15

    # Page 3: Operation Guides
    page3 = doc.new_page()
    page3.insert_text(fitz.Point(50, 60), "2. WORKSPACE OPERATIONAL GUIDE", fontsize=16, color=(0.4, 0.15, 0.65), fontname="hebo")
    page3.draw_line(fitz.Point(50, 75), fitz.Point(550, 75), color=(0.8, 0.8, 0.8), width=1)

    guides = [
        ("Step 1: Demo Authenticate", "Log in immediately using the '🚀 Launch Quick Demo Workspace' button on the landing page, or authenticate with credentials user@cosmos.com / cosmos123. System automatically creates SQLite sessions."),
        ("Step 2: Upload Files", "Drag and drop any file directly onto the dashboard container or browse select files. The system uploads and tracks storage quota sizes."),
        ("Step 3: Convert File Types", "Choose an input document and target format from the selection dropdowns. Conversions process in real-time and list outputs in your history table."),
        ("Step 4: PDF Modifications", "Perform mergers, watermarking overlays, passwords locking/decryption, rotation, and file size compressions. Converted files download directly.")
    ]
    
    y_pos = 100
    for title, text in guides:
        page3.insert_text(fitz.Point(50, y_pos), title, fontsize=11, color=(0.05, 0.55, 0.55), fontname="hebo")
        y_pos += 15
        words = text.split()
        line = ""
        for word in words:
            if len(line + " " + word) > 85:
                page3.insert_text(fitz.Point(50, y_pos), line, fontsize=9.5, color=(0.2, 0.2, 0.2), fontname="helv")
                y_pos += 14
                line = word
            else:
                line += " " + word if line else word
        if line:
            page3.insert_text(fitz.Point(50, y_pos), line, fontsize=9.5, color=(0.2, 0.2, 0.2), fontname="helv")
            y_pos += 14
        y_pos += 15

    # Save PDF
    output_pdf_path = "cosmos_convert_reference.pdf"
    doc.save(output_pdf_path)
    doc.close()
    print(f"Successfully created PDF: {output_pdf_path}")

if __name__ == "__main__":
    generate_pdf()
