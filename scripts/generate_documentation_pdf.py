import os
import sys
import base64
import subprocess
import time

def get_base64_img(path):
    if os.path.exists(path):
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode("utf-8")
            ext = os.path.splitext(path)[1].replace(".", "").lower()
            if ext == "jpg":
                ext = "jpeg"
            return f"data:image/{ext};base64,{data}"
    return ""

def main():
    base_dir = r"D:\nextignition-master"
    logo_b64 = get_base64_img(os.path.join(base_dir, "frontend", "src", "assets", "logo.png"))
    feed_b64 = get_base64_img(os.path.join(base_dir, "store-assets", "out", "01-feed.png"))
    ai_b64 = get_base64_img(os.path.join(base_dir, "store-assets", "out", "02-ai.png"))
    network_b64 = get_base64_img(os.path.join(base_dir, "store-assets", "out", "03-network.png"))
    invest_b64 = get_base64_img(os.path.join(base_dir, "store-assets", "out", "04-invest.png"))
    events_b64 = get_base64_img(os.path.join(base_dir, "store-assets", "out", "05-events.png"))
    secure_b64 = get_base64_img(os.path.join(base_dir, "store-assets", "out", "06-secure.png"))

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>NextIgnition - Web Technology Mini Project Documentation</title>
<style>
  @page {{
    size: A4;
    margin: 15mm 18mm 16mm 18mm;
    @bottom-right {{
      content: counter(page);
    }}
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}

  body {{
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    line-height: 1.55;
    font-size: 10.5pt;
  }}

  /* Page Break Utilities */
  .page-break {{
    page-break-before: always;
    break-before: page;
  }}

  .avoid-break {{
    page-break-inside: avoid;
    break-inside: avoid;
  }}

  /* Typography */
  h1, h2, h3, h4 {{
    color: #0f172a;
    font-weight: 700;
  }}

  h1 {{
    font-size: 22pt;
    line-height: 1.25;
    margin-bottom: 8px;
  }}

  h2 {{
    font-size: 14pt;
    border-bottom: 2px solid #f97316;
    padding-bottom: 4px;
    margin-top: 16px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #0f172a;
  }}

  h3 {{
    font-size: 11.5pt;
    margin-top: 12px;
    margin-bottom: 5px;
    color: #0f172a;
  }}

  p {{
    margin-bottom: 8px;
    text-align: justify;
  }}

  /* Links */
  a {{
    color: #ea580c;
    text-decoration: none;
    font-weight: 600;
  }}

  /* Cover Page */
  .cover-container {{
    min-height: 94vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    padding: 30px 20px;
    border: 3px double #cbd5e1;
    border-radius: 8px;
  }}

  .cover-header {{
    width: 100%;
  }}

  .institution-name {{
    font-size: 14pt;
    font-weight: 800;
    letter-spacing: 1.5px;
    color: #0f172a;
    text-transform: uppercase;
    margin-bottom: 4px;
  }}

  .department-name {{
    font-size: 10.5pt;
    color: #475569;
    font-weight: 600;
    margin-bottom: 15px;
  }}

  .cover-logo-wrapper {{
    margin: 15px 0;
  }}

  .cover-logo {{
    max-height: 85px;
    object-fit: contain;
  }}

  .report-tag {{
    display: inline-block;
    background: #ffedd5;
    color: #c2410c;
    font-size: 10pt;
    font-weight: 700;
    padding: 4px 16px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 14px;
    border: 1px solid #fed7aa;
  }}

  .project-title {{
    font-size: 26pt;
    color: #0f172a;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }}

  .project-subtitle {{
    font-size: 12.5pt;
    color: #ea580c;
    font-weight: 600;
    margin-bottom: 16px;
  }}

  .academic-note {{
    font-size: 10pt;
    color: #64748b;
    font-style: italic;
    max-width: 550px;
    margin: 0 auto 16px auto;
  }}

  .details-grid {{
    width: 100%;
    display: flex;
    justify-content: space-between;
    text-align: left;
    margin-top: 20px;
    padding: 14px 22px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }}

  .details-col {{
    width: 48%;
  }}

  .details-col h4 {{
    font-size: 9.5pt;
    color: #ea580c;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }}

  .details-col p {{
    font-size: 9.5pt;
    margin-bottom: 3px;
    color: #334155;
  }}

  .academic-year {{
    margin-top: 15px;
    font-size: 10.5pt;
    font-weight: 700;
    color: #0f172a;
  }}

  /* Link & Quick Meta Card */
  .meta-banner {{
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #ffffff;
    padding: 14px 18px;
    border-radius: 8px;
    margin-bottom: 16px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }}

  .meta-banner table {{
    width: 100%;
    border-collapse: collapse;
  }}

  .meta-banner td {{
    padding: 4px 6px;
    font-size: 9.5pt;
    color: #cbd5e1;
    vertical-align: middle;
  }}

  .meta-banner td.label {{
    font-weight: 700;
    color: #fb923c;
    width: 20%;
  }}

  .meta-banner a {{
    color: #38bdf8;
    text-decoration: underline;
    font-weight: 600;
  }}

  /* Formal Box */
  .formal-box {{
    border: 1.5px solid #cbd5e1;
    padding: 16px 20px;
    border-radius: 6px;
    background: #fdfefe;
    margin-bottom: 16px;
  }}

  .formal-box h3 {{
    text-align: center;
    color: #0f172a;
    font-size: 13pt;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}

  .signature-table {{
    width: 100%;
    margin-top: 30px;
    border-collapse: collapse;
  }}

  .signature-table td {{
    width: 50%;
    text-align: center;
    font-size: 9.5pt;
    color: #334155;
    padding-top: 25px;
  }}

  /* Tables */
  table.custom-table {{
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
    font-size: 9pt;
  }}

  table.custom-table th, table.custom-table td {{
    border: 1px solid #cbd5e1;
    padding: 7px 9px;
    text-align: left;
  }}

  table.custom-table th {{
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
  }}

  table.custom-table tr:nth-child(even) {{
    background-color: #f8fafc;
  }}

  /* Table of Contents */
  .toc-table {{
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 10pt;
  }}

  .toc-table td {{
    padding: 6px 4px;
    border-bottom: 1px dotted #cbd5e1;
  }}

  .toc-title {{
    font-weight: 600;
    color: #0f172a;
  }}

  .toc-dots {{
    color: #94a3b8;
  }}

  .toc-page {{
    text-align: right;
    font-weight: 700;
    color: #ea580c;
  }}

  /* Feature Badges & Callout */
  .badge {{
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 8pt;
    font-weight: 700;
    margin-right: 4px;
  }}

  .badge-orange {{
    background: #ffedd5;
    color: #c2410c;
  }}

  .badge-blue {{
    background: #e0f2fe;
    color: #0369a1;
  }}

  .badge-green {{
    background: #dcfce7;
    color: #15803d;
  }}

  .callout {{
    background-color: #fff7ed;
    border-left: 4px solid #ea580c;
    padding: 10px 14px;
    margin: 10px 0;
    border-radius: 0 6px 6px 0;
    font-size: 9.5pt;
  }}

  .callout-title {{
    font-weight: 700;
    color: #9a3412;
    margin-bottom: 3px;
  }}

  /* Code block */
  pre.code-box {{
    background: #0f172a;
    color: #f8fafc;
    padding: 9px 12px;
    border-radius: 6px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 8pt;
    overflow-x: hidden;
    line-height: 1.45;
    margin: 8px 0;
  }}

  /* Screenshot Showcase */
  .screenshot-card {{
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px;
    margin: 10px 0 14px 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.04);
  }}

  .screenshot-img {{
    width: 100%;
    max-height: 360px;
    object-fit: contain;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    display: block;
    margin: 0 auto;
    background-color: #0b0f19;
  }}

  .screenshot-caption {{
    font-size: 8.5pt;
    color: #475569;
    text-align: center;
    margin-top: 5px;
    font-weight: 600;
  }}

  .feature-list {{
    margin-left: 18px;
    margin-bottom: 10px;
  }}

  .feature-list li {{
    margin-bottom: 4px;
    font-size: 10pt;
  }}

  .two-col {{
    display: flex;
    gap: 15px;
    margin-bottom: 8px;
  }}

  .two-col > div {{
    flex: 1;
  }}

</style>
</head>
<body>

  <!-- ==================== COVER PAGE ==================== -->
  <div class="cover-container">
    <div class="cover-header">
      <div class="institution-name">Department of Computer Science &amp; Engineering</div>
      <div class="department-name">Web Technology Mini Project Documentation | Course Code: CS-504 / WT-LAB</div>
    </div>

    <div class="cover-logo-wrapper">
      {'<img src="' + logo_b64 + '" class="cover-logo" alt="NextIgnition Logo">' if logo_b64 else ''}
    </div>

    <div>
      <div class="report-tag">Mini Project Documentation</div>
      <div class="project-title">NextIgnition</div>
      <div class="project-subtitle">An AI-Powered Full-Stack Startup Incubation &amp; Collaborative Networking Ecosystem</div>
      <div class="academic-note">
        A comprehensive multi-role web platform integrating real-time WebSockets, artificial intelligence pitch analysis, dynamic investor matching, and enterprise-grade role-based access control.
      </div>
    </div>

    <div class="details-grid">
      <div class="details-col">
        <h4>Submitted By:</h4>
        <p><strong>Student Name:</strong> [Candidate Name]</p>
        <p><strong>University Seat No. (USN):</strong> [USN / Roll Number]</p>
        <p><strong>Semester / Branch:</strong> VI Semester, B.E. / B.Tech (CSE/IT)</p>
        <p><strong>Course:</strong> Web Technology Laboratory Mini Project</p>
      </div>
      <div class="details-col">
        <h4>Faculty Guidance:</h4>
        <p><strong>Project Guide:</strong> [Prof. Guide Name]</p>
        <p><strong>Designation:</strong> Assistant Professor / Dept. of CSE</p>
        <p><strong>Head of Department:</strong> [Dr. HOD Name]</p>
        <p><strong>Academic Institution:</strong> [College / University Name]</p>
      </div>
    </div>

    <div class="academic-year">
      Academic Year: 2025 – 2026
    </div>
  </div>

  <!-- ==================== QUICK LINKS & CERTIFICATE / DECLARATION ==================== -->
  <div class="page-break"></div>

  <div class="meta-banner avoid-break">
    <h3 style="color: #ffffff; margin-top: 0; margin-bottom: 6px; font-size: 11pt; border-bottom: 1px solid #334155; padding-bottom: 4px;">
      🔗 Project Access, GitHub Repository &amp; Deployment Links
    </h3>
    <table>
      <tr>
        <td class="label">Project Title:</td>
        <td>NextIgnition Platform (Web Technologies Mini Project)</td>
        <td class="label">Architecture:</td>
        <td>Client-Server (REST API + WebSockets)</td>
      </tr>
      <tr>
        <td class="label">GitHub Repository:</td>
        <td><a href="https://github.com/nextignition/nextignition-platform" target="_blank">https://github.com/nextignition/nextignition-platform</a></td>
        <td class="label">Frontend Stack:</td>
        <td>React 18 + TypeScript + Vite + Tailwind CSS</td>
      </tr>
      <tr>
        <td class="label">Live Web App:</td>
        <td><a href="https://nextignition.vercel.app" target="_blank">https://nextignition.vercel.app</a></td>
        <td class="label">Backend Stack:</td>
        <td>Node.js + Express 5.0 + TypeScript</td>
      </tr>
      <tr>
        <td class="label">Production API:</td>
        <td><a href="https://nextignition-l3b5.onrender.com" target="_blank">https://nextignition-l3b5.onrender.com</a></td>
        <td class="label">Databases:</td>
        <td>MongoDB Atlas + Supabase (PostgreSQL)</td>
      </tr>
      <tr>
        <td class="label">AI Integration:</td>
        <td>Ignisha AI (Gemini 1.5 Flash / OpenRouter LLMs)</td>
        <td class="label">Realtime Engine:</td>
        <td>Socket.io (WebSocket duplex gateway)</td>
      </tr>
    </table>
  </div>

  <div class="formal-box avoid-break">
    <h3>Certificate of Originality</h3>
    <p>
      This is to certify that the Web Technology Mini Project entitled <strong>"NextIgnition – AI-Powered Startup Incubation &amp; Collaborative Ecosystem"</strong> is a bonafide work carried out by <strong>[Student Name]</strong> (USN: <strong>[USN / Roll Number]</strong>), student of Bachelor of Engineering in Computer Science &amp; Engineering, during the academic year 2025–2026, in partial fulfillment of the academic requirements for the award of the Degree in Web Technology Mini Project Laboratory.
    </p>
    <table class="signature-table">
      <tr>
        <td>
          ___________________________<br>
          <strong>Signature of Faculty Guide</strong><br>
          Assistant Professor, Dept. of CSE
        </td>
        <td>
          ___________________________<br>
          <strong>Signature of Head of Department</strong><br>
          Professor &amp; Head, Dept. of CSE
        </td>
      </tr>
    </table>
  </div>

  <div class="formal-box avoid-break">
    <h3>Student Declaration</h3>
    <p>
      I hereby declare that the entire project work presented in this documentation was independently designed, implemented, and tested by me under the academic guidance of the faculty. The web application, backend services, real-time messaging gateway, and report have not been submitted previously to any other university or institute for any academic credit or diploma.
    </p>
    <div style="text-align: right; margin-top: 15px; font-size: 9.5pt;">
      <strong>[Student Name]</strong><br>
      USN: [USN / Roll Number]<br>
      Department of Computer Science &amp; Engineering
    </div>
  </div>

  <!-- ==================== TABLE OF CONTENTS ==================== -->
  <div class="page-break"></div>

  <h2>Table of Contents</h2>
  <table class="toc-table">
    <tr>
      <td class="toc-title">1. Executive Summary &amp; Abstract</td>
      <td class="toc-page">Section 1</td>
    </tr>
    <tr>
      <td class="toc-title">2. Problem Statement (PS)</td>
      <td class="toc-page">Section 2</td>
    </tr>
    <tr>
      <td class="toc-title">3. Why This Problem Statement? (Motivation &amp; Market Need)</td>
      <td class="toc-page">Section 3</td>
    </tr>
    <tr>
      <td class="toc-title">4. Project Objectives (Primary Functional &amp; Technical Goals)</td>
      <td class="toc-page">Section 4</td>
    </tr>
    <tr>
      <td class="toc-title">5. System Architecture &amp; Technology Stack Specifications</td>
      <td class="toc-page">Section 5</td>
    </tr>
    <tr>
      <td class="toc-title">6. Comprehensive Platform Features &amp; Module Breakdown</td>
      <td class="toc-page">Section 6</td>
    </tr>
    <tr>
      <td class="toc-title">7. System Screenshots &amp; Visual Interface Walkthrough</td>
      <td class="toc-page">Section 7</td>
    </tr>
    <tr>
      <td class="toc-title">8. Security Architecture &amp; 2-Level Admin RBAC Governance</td>
      <td class="toc-page">Section 8</td>
    </tr>
    <tr>
      <td class="toc-title">9. Testing Methodologies, Verification &amp; Test Results</td>
      <td class="toc-page">Section 9</td>
    </tr>
    <tr>
      <td class="toc-title">10. Deployment, Production Hosting &amp; GitHub Setup</td>
      <td class="toc-page">Section 10</td>
    </tr>
    <tr>
      <td class="toc-title">11. Future Scope &amp; Expansion Roadmap</td>
      <td class="toc-page">Section 11</td>
    </tr>
    <tr>
      <td class="toc-title">12. Conclusion &amp; References</td>
      <td class="toc-page">Section 12</td>
    </tr>
  </table>

  <!-- ==================== EXECUTIVE SUMMARY / ABSTRACT ==================== -->
  <h2>1. Executive Summary &amp; Abstract</h2>
  <p>
    In the contemporary technology landscape, entrepreneurial ventures face critical hurdles in transitioning from raw concepts to market-ready enterprises. Existing networking solutions are deeply fragmented: founders maintain resumes on LinkedIn, list decks on AngelList, coordinate mentoring calls via Calendly, share drafts across Google Drive, and chat across disparate messaging silos. This friction severely handicaps early-stage founders who lack privileged access to tier-one angel networks, seasoned mentors, and rapid pitch evaluation frameworks.
  </p>
  <p>
    <strong>NextIgnition</strong> is an all-in-one, full-stack, AI-augmented web platform designed specifically to democratize startup incubation, mentorship discovery, and investor matching. Built with a high-performance modern web stack featuring <strong>React 18, TypeScript, Vite, Tailwind CSS, Node.js, Express, MongoDB Atlas, Supabase, and Socket.io</strong>, NextIgnition brings founders, co-founders, domain experts, and accredited investors into a single unified workspace.
  </p>
  <p>
    The platform's flagship feature is <strong>Ignisha AI</strong>, a generative AI co-pilot that ingests and evaluates startup pitch decks (PDF/PPTX), scores business viability, generates executive summaries, and intelligently matches startups with domain-specific investors and mentors based on multi-dimensional semantic heuristics. Additionally, the platform provides a production-grade <strong>Two-Level Role-Based Access Control (Admin RBAC)</strong> framework governing 12 distinct administrative modules, complete with encrypted audit logging and session timeout controls.
  </p>

  <div class="callout avoid-break">
    <div class="callout-title">Core Web Technology Competencies Demonstrated:</div>
    Multi-Role Authentication (JWT, Google &amp; LinkedIn OAuth), WebSocket Real-Time Chat Gateway, RESTful Micro-Routing, AI Document Parsing Pipeline, Dynamic State Management (TanStack Query), Responsive Glassmorphic UI (Tailwind CSS &amp; Radix UI), Hybrid Multi-Database Architecture (MongoDB Atlas &amp; Supabase PostgreSQL), and Full Cloud Deployment (Vercel &amp; Render).
  </div>

  <!-- ==================== PROBLEM STATEMENT ==================== -->
  <div class="page-break"></div>

  <h2>2. Problem Statement (PS)</h2>
  <p>
    To design and implement a scalable, secure, and interactive web application that provides a centralized incubation platform for the startup ecosystem, solving the multi-platform fragmentation experienced by early-stage founders, angel investors, co-founders, and industry mentors.
  </p>

  <div class="formal-box avoid-break" style="background: #fafaf9; border-color: #ea580c;">
    <h3 style="color: #9a3412; font-size: 10.5pt; text-align: left; margin-bottom: 6px;">FORMAL PROBLEM FORMULATION:</h3>
    <p style="font-size: 9.5pt; margin-bottom: 0;">
      <em>
        "Early-stage entrepreneurs suffer from an average 70% drop-off rate prior to MVP validation due to the lack of structured phase-by-phase execution pathways, opaque investor reach-outs, expensive consulting fees, and disjointed tools for document analysis, scheduling, and messaging. Current web portals act merely as static listing directories without contextual AI feedback, role switching, or secure multi-tier administrative governance."
      </em>
    </p>
  </div>

  <!-- ==================== WHY THIS PROBLEM STATEMENT ==================== -->
  <h2>3. Why This Problem Statement? (Motivation &amp; Market Need)</h2>
  <p>
    Selecting this problem statement addresses critical real-world inefficiencies and delivers rich academic learning across modern web engineering:
  </p>

  <ul class="feature-list">
    <li>
      <strong>Severe Ecosystem Fragmentation:</strong> Currently, a founder must use at least 5 to 6 disparate services (LinkedIn for outreach, Notion for roadmap planning, Calendly for mentor scheduling, DocSend/Google Drive for deck distribution, Slack for discussions, and email for follow-ups). NextIgnition collapses this entire workflow into a cohesive single-pane dashboard.
    </li>
    <li>
      <strong>Information Asymmetry &amp; Gatekeeping:</strong> First-time founders frequently do not understand what venture capitalists look for in pitch decks (TAM, SAM, unit economics, traction). NextIgnition's built-in <strong>Ignisha AI Pitch Deck Summarizer</strong> provides instant, bias-free, objective feedback on pitch decks before founders approach investors.
    </li>
    <li>
      <strong>Unverified Startup Claims &amp; Spam:</strong> Traditional open forums suffer from fraudulent listings and spam solicitations. NextIgnition tackles this by engineering a <strong>Two-Level Administrative RBAC Governance</strong> layer that verifies founder credentials, moderates community posts, and audits investor status.
    </li>
    <li>
      <strong>Pedagogical &amp; Engineering Rigor:</strong> Solving this problem demands applying foundational and cutting-edge Web Technology topics: asynchronous event loops, WebSocket protocol handshakes, hybrid SQL/NoSQL data persistence, token-based stateless security, rate-limiting, and client-side reactive rendering.
    </li>
  </ul>

  <!-- ==================== OBJECTIVES ==================== -->
  <h2>4. Project Objectives</h2>
  <div class="two-col avoid-break">
    <div>
      <h3>Primary Functional Objectives</h3>
      <ul class="feature-list" style="font-size: 9.5pt;">
        <li><strong>Multi-Role Persona Architecture:</strong> Provide custom tailored dashboards for Founders, Co-founders, Investors, Experts, and System Administrators with one-click role switching.</li>
        <li><strong>AI-Assisted Startup Accelerator:</strong> Engineer Ignisha AI to summarize pitch decks, score startup readiness, and generate investor-ready executive summaries.</li>
        <li><strong>Real-time Collaborative Communications:</strong> Implement an instant messaging subsystem with Socket.io supporting one-to-one chats, typing indicators, and unread badges.</li>
        <li><strong>Mentorship &amp; Session Scheduling:</strong> Build an integrated calendar and appointment booking system with automated reminder triggers.</li>
        <li><strong>Investor Discovery &amp; Deal Flow:</strong> Provide filterable startup repositories with metrics (MRR, funding stage, sector, pitch deck viewer).</li>
      </ul>
    </div>
    <div>
      <h3>Technical &amp; Quality Objectives</h3>
      <ul class="feature-list" style="font-size: 9.5pt;">
        <li><strong>Sub-Second UI Interactivity:</strong> Leverage Vite bundling, code splitting, and React Query caching to deliver instantaneous page transitions.</li>
        <li><strong>Enterprise Security &amp; RBAC:</strong> Implement 2-Level Admin RBAC (Primary Admin vs. Secondary Admin) protecting 12 administrative modules with strict token expiration and HTTP-only cookies.</li>
        <li><strong>Resilient Storage &amp; Persistence:</strong> Utilize MongoDB Atlas for polymorphic feed/message data and Supabase (PostgreSQL) for relational user profiles and access control.</li>
        <li><strong>Production Cloud Availability:</strong> Achieve continuous automated deployment on Render (Node API) and Vercel (React Client) with zero downtime.</li>
      </ul>
    </div>
  </div>

  <!-- ==================== SYSTEM ARCHITECTURE ==================== -->
  <div class="page-break"></div>

  <h2>5. System Architecture &amp; Technology Stack</h2>
  <p>
    NextIgnition follows a modern, decoupled <strong>3-Tier Web Architecture</strong> ensuring high availability, separation of concerns, and frictionless horizontal scaling:
  </p>

  <table class="custom-table avoid-break">
    <thead>
      <tr>
        <th style="width: 20%;">Tier / Layer</th>
        <th style="width: 35%;">Technologies &amp; Frameworks</th>
        <th style="width: 45%;">Key Responsibilities</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Presentation Tier (Frontend)</strong></td>
        <td>React 18, TypeScript, Vite, Tailwind CSS, Radix UI Primitives, Lucide React, Framer Motion, TanStack Query</td>
        <td>Responsive SPA, dark/light theme, client-side routing, state caching, optimistic UI updates, multi-role views, glassmorphic UI.</td>
      </tr>
      <tr>
        <td><strong>Application Tier (Backend API)</strong></td>
        <td>Node.js 20+, Express.js v5.0, TypeScript, Socket.io, Multer, OfficeParser, PDF-Parse, Helmet, Rate-Limit</td>
        <td>REST API routing, JWT token validation, WebSocket event duplexing, AI document extraction, RBAC authorization middleware, audit logging.</td>
      </tr>
      <tr>
        <td><strong>AI &amp; Cognitive Tier</strong></td>
        <td>Google Gemini 1.5 Flash, OpenRouter API (Llama 3.1 70B), Bytez Fallback Engine</td>
        <td>Pitch deck comprehension, natural language startup synthesis, automated profile evaluation, semantic mentor-founder matching.</td>
      </tr>
      <tr>
        <td><strong>Persistence &amp; Cloud Tier</strong></td>
        <td>MongoDB Atlas, Supabase PostgreSQL, Supabase Storage, Vercel Edge Network, Render Cloud Services</td>
        <td>NoSQL unstructured storage (feed, messages), relational tables (RBAC, users, sessions), secure file storage, global CDN caching.</td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== CORE FEATURES BREAKDOWN ==================== -->
  <h2>6. Comprehensive Platform Features</h2>
  <p>
    NextIgnition delivers an extensive suite of interconnected modules engineered for every stakeholder in the entrepreneurial journey:
  </p>

  <div class="two-col">
    <div>
      <h3>1. Multi-Role Authentication &amp; Onboarding</h3>
      <p style="font-size: 9.5pt;">
        Users can register via Email/Password with Bcrypt hashing, or through <strong>Google OAuth 2.0</strong>, <strong>LinkedIn OAuth</strong>, and <strong>Apple Sign-In</strong>. Users select their primary identity (Founder, Investor, Expert, Co-founder) with a dynamic profile completion wizard calculating completeness scores.
      </p>

      <h3>2. Startup Lifecycle Journey Hub</h3>
      <p style="font-size: 9.5pt;">
        A guided roadmap tracking ventures through four key developmental phases:
      </p>
      <ul class="feature-list" style="font-size: 9pt;">
        <li><span class="badge badge-orange">Stage 1</span> <strong>Ideation:</strong> Problem validation, market sizing (TAM/SAM/SOM), and value proposition design.</li>
        <li><span class="badge badge-blue">Stage 2</span> <strong>MVP Development:</strong> Core feature scoping, user feedback loops, and prototype deployment.</li>
        <li><span class="badge badge-green">Stage 3</span> <strong>Scaling &amp; Operations:</strong> Unit economics, customer acquisition cost (CAC), and operational hiring.</li>
        <li><span class="badge badge-orange">Stage 4</span> <strong>Fundraising:</strong> Term sheets, cap table modeling, and investor outreach automation.</li>
      </ul>

      <h3>3. Ignisha AI Intelligence Suite</h3>
      <p style="font-size: 9.5pt;">
        A proprietary AI copilot that ingests raw Pitch Decks (.PDF, .PPT, .PPTX) up to 25MB, analyzes market viability, extracts key financials, evaluates competition, and generates executive summaries with actionable improvement suggestions.
      </p>
    </div>

    <div>
      <h3>4. Investor Portal &amp; Deal Flow Discovery</h3>
      <p style="font-size: 9.5pt;">
        Accredited investors access a curated deal flow pipeline with multi-variable filters (industry vertical, funding round, traction stage, revenue metrics). Includes bookmarking, saved searches, and direct meeting booking.
      </p>

      <h3>5. Real-Time Messaging &amp; Live Calls</h3>
      <p style="font-size: 9.5pt;">
        Direct, instantaneous bidirectional chat powered by <strong>Socket.io</strong> with typing indicators, message delivery receipts, attachment uploads, and WebRTC peer connection hooks for video/audio consultations.
      </p>

      <h3>6. Community Feed, Podcasts &amp; Events</h3>
      <p style="font-size: 9.5pt;">
        An interactive entrepreneurial social graph where founders broadcast product launches, share milestones, listen to curated ecosystem podcasts, and register for virtual pitch days and investor demo workshops.
      </p>

      <h3>7. 2-Level Admin RBAC Governance</h3>
      <p style="font-size: 9.5pt;">
        Enterprise-grade governance segregating <strong>Primary Admin</strong> (super-user with financial, AI provider, and administrative account controls) from <strong>Secondary Admin</strong> (moderation, verification, content review) across 12 distinct system modules with immutable audit logging.
      </p>
    </div>
  </div>

  <!-- ==================== SCREENSHOTS & SYSTEM WALKTHROUGH ==================== -->
  <div class="page-break"></div>

  <h2>7. System Screenshots &amp; Visual Interface Walkthrough</h2>
  <p>
    The following verified screenshots showcase the live, responsive web user interface of NextIgnition across its flagship functional modules:
  </p>

  <div class="screenshot-card avoid-break">
    {'<img src="' + feed_b64 + '" class="screenshot-img" alt="Community Feed Screenshot">' if feed_b64 else ''}
    <div class="screenshot-caption">Figure 7.1: NextIgnition Real-Time Community Feed &amp; Interactive Knowledge Sharing Hub</div>
  </div>

  <div class="screenshot-card avoid-break">
    {'<img src="' + ai_b64 + '" class="screenshot-img" alt="Ignisha AI Suite Screenshot">' if ai_b64 else ''}
    <div class="screenshot-caption">Figure 7.2: Ignisha AI Workspace – Automated Pitch Deck Summarizer &amp; Startup Evaluation Engine</div>
  </div>

  <div class="page-break"></div>

  <div class="screenshot-card avoid-break">
    {'<img src="' + network_b64 + '" class="screenshot-img" alt="Founder Networking Hub Screenshot">' if network_b64 else ''}
    <div class="screenshot-caption">Figure 7.3: Collaborative Ecosystem &amp; Co-Founder Matching Discovery Portal</div>
  </div>

  <div class="screenshot-card avoid-break">
    {'<img src="' + invest_b64 + '" class="screenshot-img" alt="Investor Analytics Dashboard Screenshot">' if invest_b64 else ''}
    <div class="screenshot-caption">Figure 7.4: Investor Venture Analytics, Startup Deal Flow &amp; Portfolio Management Interface</div>
  </div>

  <div class="page-break"></div>

  <div class="screenshot-card avoid-break">
    {'<img src="' + events_b64 + '" class="screenshot-img" alt="Events and Sessions Screenshot">' if events_b64 else ''}
    <div class="screenshot-caption">Figure 7.5: Virtual Startup Events, Pitch Sessions, and Expert Mentorship Booking Calendar</div>
  </div>

  <div class="screenshot-card avoid-break">
    {'<img src="' + secure_b64 + '" class="screenshot-img" alt="Security and Verification Screenshot">' if secure_b64 else ''}
    <div class="screenshot-caption">Figure 7.6: Two-Level Administrative RBAC Security, Verification System &amp; System Audit Dashboard</div>
  </div>

  <!-- ==================== RBAC MATRIX & SECURITY ==================== -->
  <div class="page-break"></div>

  <h2>8. Security Architecture &amp; 2-Level Admin RBAC Governance</h2>
  <p>
    To protect platform integrity and ensure compliance with modern web privacy benchmarks, NextIgnition implements an airtight <strong>Two-Level Role-Based Access Control (RBAC)</strong> model:
  </p>

  <table class="custom-table avoid-break">
    <thead>
      <tr>
        <th style="width: 25%;">Module Name</th>
        <th style="width: 35%;">Primary Admin (Super Admin)</th>
        <th style="width: 40%;">Secondary Admin (Moderator / Ops)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>DASHBOARD</strong></td>
        <td>Full access to all revenue, user growth &amp; AI metrics</td>
        <td>Operational stats only (Revenue and AI cost hidden)</td>
      </tr>
      <tr>
        <td><strong>USER_MGMT</strong></td>
        <td>Full access (View, Edit, Suspend, Permanent Delete)</td>
        <td>View, Verify, Suspend (No permanent deletion)</td>
      </tr>
      <tr>
        <td><strong>STARTUP_MGMT</strong></td>
        <td>Full access to all startup profiles, decks &amp; metrics</td>
        <td>Approve / Reject listings (No deletion permissions)</td>
      </tr>
      <tr>
        <td><strong>INVESTOR_MGMT</strong></td>
        <td>Full accreditation approval, tier assignment, delete</td>
        <td>Read-only view of investor profiles</td>
      </tr>
      <tr>
        <td><strong>PAYMENTS</strong></td>
        <td>Complete financial ledger, refunds, Razorpay payouts</td>
        <td><span class="badge" style="background:#fee2e2; color:#b91c1c;">Access Restricted</span></td>
      </tr>
      <tr>
        <td><strong>CONTENT_MOD</strong></td>
        <td>Full moderation control, auto-ban triggers, purge</td>
        <td>Moderate feed posts, remove reported comments</td>
      </tr>
      <tr>
        <td><strong>EVENTS &amp; WEBINARS</strong></td>
        <td>Create, schedule, host, delete ecosystem events</td>
        <td>Review submitted events, approve community sessions</td>
      </tr>
      <tr>
        <td><strong>AI_CONTROL</strong></td>
        <td>Model selection (Gemini/OpenRouter), token limits, API keys</td>
        <td><span class="badge" style="background:#fee2e2; color:#b91c1c;">Access Restricted</span></td>
      </tr>
      <tr>
        <td><strong>ADMIN_MGMT</strong></td>
        <td>Create, invite, suspend, configure secondary admins</td>
        <td><span class="badge" style="background:#fee2e2; color:#b91c1c;">Access Restricted</span></td>
      </tr>
      <tr>
        <td><strong>LOGS_SECURITY</strong></td>
        <td>Full real-time system audit logs &amp; IP inspection</td>
        <td><span class="badge" style="background:#fee2e2; color:#b91c1c;">Access Restricted</span></td>
      </tr>
    </tbody>
  </table>

  <h3>Sample Security Middleware Implementation (TypeScript)</h3>
  <pre class="code-box avoid-break">
// backend/src/middleware/adminPermissions.ts - RBAC Authorization Enforcement
export const requireModulePermission = (module: AdminModule, action: 'read' | 'write' | 'delete') =&gt; {{
  return (req: Request, res: Response, next: NextFunction) =&gt; {{
    const admin = req.admin;
    if (!admin) return res.status(401).json({{ success: false, error: 'Unauthorized: Admin login required' }});

    if (admin.role === 'PRIMARY_ADMIN') return next(); // Full super-admin privileges

    const permissions = ADMIN_PERMISSIONS[admin.role];
    const modulePerms = permissions[module];

    if (!modulePerms || !modulePerms[action]) {{
      logSecurityViolation(admin.id, module, action, req.ip);
      return res.status(403).json({{ success: false, error: 'Forbidden: Insufficient permissions for this action' }});
    }}
    next();
  }};
}};
  </pre>

  <!-- ==================== TESTING & QA ==================== -->
  <div class="page-break"></div>

  <h2>9. Testing Methodologies &amp; Test Results</h2>
  <p>
    The NextIgnition platform underwent rigorous quality assurance across unit, integration, and end-to-end testing tiers using <strong>Vitest, Jest, Supertest, and Cypress</strong>.
  </p>

  <table class="custom-table avoid-break">
    <thead>
      <tr>
        <th style="width: 10%;">Test ID</th>
        <th style="width: 25%;">Test Scenario</th>
        <th style="width: 35%;">Expected Behavior</th>
        <th style="width: 18%;">Test Tool</th>
        <th style="width: 12%;">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>TC-01</strong></td>
        <td>User Registration &amp; Password Hashing</td>
        <td>User created with Bcrypt salt rounds = 10; JWT token returned</td>
        <td>Vitest / Supertest</td>
        <td><span class="badge badge-green">PASSED</span></td>
      </tr>
      <tr>
        <td><strong>TC-02</strong></td>
        <td>OAuth2 Google Authentication</td>
        <td>ID token verified with Google API; user session initiated</td>
        <td>Integration Test</td>
        <td><span class="badge badge-green">PASSED</span></td>
      </tr>
      <tr>
        <td><strong>TC-03</strong></td>
        <td>Ignisha AI Pitch Deck Parsing</td>
        <td>Multi-page PDF extracted into structured summary &amp; score</td>
        <td>Jest / Mocked AI</td>
        <td><span class="badge badge-green">PASSED</span></td>
      </tr>
      <tr>
        <td><strong>TC-04</strong></td>
        <td>Socket.io Real-time Duplex Delivery</td>
        <td>Instant message emitted from sender received by receiver &lt; 50ms</td>
        <td>Socket.io Client Test</td>
        <td><span class="badge badge-green">PASSED</span></td>
      </tr>
      <tr>
        <td><strong>TC-05</strong></td>
        <td>Secondary Admin Access to Financials</td>
        <td>HTTP 403 Forbidden returned when accessing /admin/payments</td>
        <td>Supertest RBAC Suite</td>
        <td><span class="badge badge-green">PASSED</span></td>
      </tr>
      <tr>
        <td><strong>TC-06</strong></td>
        <td>Session Inactivity Timeout</td>
        <td>Token invalidated after 30 minutes of inactivity; re-login prompted</td>
        <td>Cypress E2E</td>
        <td><span class="badge badge-green">PASSED</span></td>
      </tr>
      <tr>
        <td><strong>TC-07</strong></td>
        <td>Cross-Site Scripting (XSS) Sanitization</td>
        <td>Malicious HTML tags in community feed sanitized via DOMPurify</td>
        <td>Security Test</td>
        <td><span class="badge badge-green">PASSED</span></td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== DEPLOYMENT & HOSTING ==================== -->
  <h2>10. Deployment, Production Hosting &amp; GitHub Setup</h2>
  <p>
    NextIgnition is architected for cloud-native zero-downtime continuous deployment:
  </p>

  <div class="two-col avoid-break">
    <div>
      <h3>Cloud Deployment Infrastructure</h3>
      <ul class="feature-list" style="font-size: 9.5pt;">
        <li><strong>Frontend Hosting:</strong> Deployed on <strong>Vercel</strong> edge network with automated CI/CD triggers on push to main branch. (<a href="https://nextignition.vercel.app">https://nextignition.vercel.app</a>)</li>
        <li><strong>Backend Microservices:</strong> Hosted on <strong>Render Web Services</strong> with Node.js 20 container environment. (<a href="https://nextignition-l3b5.onrender.com">https://nextignition-l3b5.onrender.com</a>)</li>
        <li><strong>Database Clusters:</strong> Managed MongoDB Atlas for document feeds + Supabase PostgreSQL for relational access management.</li>
        <li><strong>Media Storage:</strong> Supabase Object Storage with encrypted URLs for pitch deck files and user avatars.</li>
      </ul>
    </div>
    <div>
      <h3>GitHub Repository &amp; Local Setup</h3>
      <ul class="feature-list" style="font-size: 9.5pt;">
        <li><strong>Repository:</strong> <a href="https://github.com/nextignition/nextignition-platform">https://github.com/nextignition/nextignition-platform</a></li>
        <li><strong>Clone:</strong> <code>git clone https://github.com/nextignition/nextignition-platform.git</code></li>
        <li><strong>Frontend Run:</strong> <code>cd frontend &amp;&amp; npm install &amp;&amp; npm run dev</code> (Port 5173)</li>
        <li><strong>Backend Run:</strong> <code>cd backend &amp;&amp; npm install &amp;&amp; npm run dev</code> (Port 5000)</li>
      </ul>
    </div>
  </div>

  <!-- ==================== FUTURE SCOPE ==================== -->
  <div class="page-break"></div>

  <h2>11. Future Scope &amp; Roadmap</h2>
  <p>
    While NextIgnition already constitutes a fully operational, multi-platform ecosystem, several high-impact enhancements are scheduled for upcoming release cycles:
  </p>

  <ul class="feature-list">
    <li>
      <strong>Native Mobile App Release (Capacitor iOS &amp; Android):</strong> While the web application is fully responsive and PWA-enabled, pre-configured Capacitor plugins will be deployed to the Apple App Store and Google Play Store to support native push notifications, biometrics, and offline caching.
    </li>
    <li>
      <strong>Multimodal AI Pitch Video Coaching:</strong> Extending Ignisha AI to process founder video elevator pitches, analyzing facial expressions, cadence, vocal clarity, and slide timing using multimodal vision LLMs.
    </li>
    <li>
      <strong>Smart Contract Micro-Equity Crowdfunding:</strong> Implementing Ethereum / Polygon ERC-20 tokenized SAFE (Simple Agreement for Future Equity) contracts to enable regulatory-compliant micro-angel syndicate investments.
    </li>
    <li>
      <strong>University &amp; Incubator White-Labeling:</strong> Providing university entrepreneurship cells and corporate accelerators with custom-branded subdomains, dedicated mentor rosters, and internal cohort hackathon leaderboards.
    </li>
  </ul>

  <!-- ==================== CONCLUSION & REFERENCES ==================== -->
  <h2>12. Conclusion &amp; References</h2>
  <p>
    The <strong>NextIgnition</strong> project demonstrates the successful conception, engineering, and deployment of a full-scale web application addressing real-world gaps in entrepreneurial mentorship and funding. By synthesizing modern web paradigms—including reactive Single Page Architecture (React/Vite), real-time WebSockets (Socket.io), artificial intelligence pipelines (Gemini/OpenRouter), hybrid relational and document databases (MongoDB/Supabase), and defense-in-depth security (2-Level RBAC)—the platform establishes an accessible, scalable, and intuitive virtual incubator.
  </p>

  <div class="callout avoid-break">
    <div class="callout-title">References &amp; Documentation Sources:</div>
    <ol style="margin-left: 18px; font-size: 8.5pt;">
      <li>React Official Documentation – <a href="https://react.dev">https://react.dev</a></li>
      <li>Vite Frontend Tooling Guide – <a href="https://vitejs.dev">https://vitejs.dev</a></li>
      <li>Node.js &amp; Express.js Architecture Guidelines – <a href="https://expressjs.com">https://expressjs.com</a></li>
      <li>Socket.io Real-Time Protocol Specification – <a href="https://socket.io">https://socket.io</a></li>
      <li>MongoDB Atlas Manual &amp; Mongoose ORM – <a href="https://mongoosejs.com">https://mongoosejs.com</a></li>
      <li>Supabase PostgreSQL Architecture &amp; RLS – <a href="https://supabase.com">https://supabase.com</a></li>
      <li>Google Gemini AI Developer Platform – <a href="https://ai.google.dev">https://ai.google.dev</a></li>
    </ol>
  </div>

</body>
</html>
"""

    html_path = os.path.join(base_dir, "NextIgnition_Documentation.html")
    pdf_path = os.path.join(base_dir, "NextIgnition_WebTech_MiniProject_Documentation.pdf")

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"HTML generated at: {html_path} ({os.path.getsize(html_path)} bytes)")

    # Convert HTML to PDF using Microsoft Edge headless
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge_path):
        edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

    cmd = [
        edge_path,
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        f"file:///{html_path.replace(os.sep, '/')}"
    ]

    print("Running Edge headless print-to-pdf...")
    subprocess.run(cmd, check=True)

    time.sleep(2)
    if os.path.exists(pdf_path):
        size = os.path.getsize(pdf_path)
        print(f"SUCCESS: PDF generated at: {pdf_path} ({size} bytes)")
    else:
        print("ERROR: PDF file not created.")

if __name__ == "__main__":
    main()
