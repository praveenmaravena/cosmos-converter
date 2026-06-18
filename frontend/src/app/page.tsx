'use client';

import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, FileText, Image as ImageIcon, Cpu, ShieldAlert, Sparkles, 
  User, Globe, Moon, Sun, ArrowRight, Check, Star, Settings, Trash, LogOut, 
  ChevronDown, CheckCircle, Users, CreditCard, LayoutDashboard, Share2, Search, HelpCircle
} from 'lucide-react';
import { LANGUAGES, getTranslation, TranslationKey } from '../utils/translations';
import TipTapEditor from '../components/TipTapEditor';


// API Base URL (FastAPI)
const API_BASE = 'http://localhost:8000/api';

export default function Home() {
  // Localization & Theme State
  const [lang, setLang] = useState('en');
  const [langSearch, setLangSearch] = useState('');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [theme, setTheme] = useState('galaxy'); // galaxy, space, dark, light

  // Authentication State
  const [user, setUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [totpSetup, setTotpSetup] = useState<any>(null);
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempUserId, setTempUserId] = useState('');

  // Active Screen/Tab in Dashboard
  const [activeTab, setActiveTab] = useState<'dashboard' | 'editor' | 'image' | 'ocr' | 'billing' | 'admin'>('dashboard');

  // File Upload & Conversion Engine State
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [targetFormat, setTargetFormat] = useState('PDF');
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [conversionQueue, setConversionQueue] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);


  // Advanced PDF Tools State
  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>([]);
  const [watermarkText, setWatermarkText] = useState('');
  const [pdfPassword, setPdfPassword] = useState('');
  const [pdfPagesInput, setPdfPagesInput] = useState('');
  const [pdfRotationAngle, setPdfRotationAngle] = useState(90);

  // TipTap / Document Editor Text state
  const [editorTitle, setEditorTitle] = useState('Untitled Document');
  const [editorContent, setEditorContent] = useState('<h1>Welcome to TipTap Editor</h1><p>Start writing or edit your converted PDF text directly inside this workspace.</p>');


  
  // Image Editor State
  const [imageCropX, setImageCropX] = useState(0);
  const [imageCropY, setImageCropY] = useState(0);
  const [imageWidth, setImageWidth] = useState(800);
  const [imageHeight, setImageHeight] = useState(600);
  const [imageFilter, setImageFilter] = useState('none');

  // AI & OCR Scanner State
  const [ocrText, setOcrText] = useState('');
  const [ocrResults, setOcrResults] = useState<any>(null);
  const [ocrType, setOcrType] = useState<'general' | 'invoice' | 'businesscard'>('general');
  const [ocrLoading, setOcrLoading] = useState(false);

  // AI Assistant Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([
    { sender: 'ai', text: 'Hello! I am Cosmos AI, ready to assist you with file conversion, translation, and summary tasks.' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Collaboration State
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([
    { email: 'colleague1@cosmos.com', role: 'editor' },
    { email: 'viewer@cosmos.com', role: 'viewer' }
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');

  // Admin Panel Metrics
  const [adminStats, setAdminStats] = useState<any>({
    users: 1420,
    documents: 5630,
    total_conversions: 8940,
    completed_conversions: 8710,
    failed_conversions: 230,
    storage_used_bytes: 14200000000
  });

  // Load User from Local Storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedLang = localStorage.getItem('lang');
    if (savedToken && savedUser) {
      setAuthToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  // Fetch user file list from Backend
  const refreshFiles = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE}/files/list`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUploadedFiles(data);
      }
    } catch (e) {
      console.error("Failed to load files", e);
    }
  };

  useEffect(() => {
    if (authToken) {
      refreshFiles();
    }
  }, [authToken]);

  // Translate wrapper
  const t = (key: TranslationKey) => getTranslation(lang, key);

  // Multi-Language handler
  const handleLanguageChange = (code: string) => {
    setLang(code);
    localStorage.setItem('lang', code);
    setLangDropdownOpen(false);
  };

  // Auth Submit Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authTab === 'login') {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword, totp_code: totpCode || undefined })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Authentication failed');

        if (data.requires_2fa) {
          setRequires2FA(true);
          setTempUserId(data.user_id);
          return;
        }

        setAuthToken(data.access_token);
        localStorage.setItem('token', data.access_token);
        
        // Mock profile request
        const profile = { id: 'mock-id', email: authEmail, full_name: authName || 'Space Traveler', is_superuser: authEmail.includes('admin') };
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
      } else {
        const res = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword, full_name: authName })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Signup failed');
        setAuthTab('login');
        alert("Account created successfully! Please login.");
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleOAuthLogin = async (provider: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/oauth-mock/${provider}?email=oauth_${provider}@cosmos.com&name=Cosmic%20${provider}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setAuthToken(data.access_token);
        localStorage.setItem('token', data.access_token);
        const profile = { id: 'oauth-id', email: `oauth_${provider}@cosmos.com`, full_name: `Cosmic ${provider}`, is_superuser: false };
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDemoLogin = async (targetTab?: string) => {
    setAuthEmail('user@cosmos.com');
    setAuthPassword('cosmos123');
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@cosmos.com', password: 'cosmos123' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');

      setAuthToken(data.access_token);
      localStorage.setItem('token', data.access_token);
      
      const profile = { id: 'mock-id', email: 'user@cosmos.com', full_name: 'Demo Space Explorer', is_superuser: false };
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
      if (targetTab) {
        setActiveTab(targetTab as any);
      }
    } catch (err: any) {
      // Local offline fallback just in case backend is loading or offline
      console.log("Using offline workspace fallback", err);
      const profile = { id: 'mock-id', email: 'user@cosmos.com', full_name: 'Demo Space Explorer', is_superuser: false };
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
      setAuthToken('offline-token');
      localStorage.setItem('token', 'offline-token');
      if (targetTab) {
        setActiveTab(targetTab as any);
      }
    }
  };


  const handleLogout = () => {
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };


  // 2FA Setup trigger
  const handleSetup2FA = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/setup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setTotpSetup(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerify2FA = async () => {
    if (!authToken || !totpCode) return;
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/verify?code=${totpCode}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        alert("Two-Factor Authentication is successfully activated!");
        setTotpSetup(null);
        setTotpCode('');
        // Update user state
        const updated = { ...user, two_factor_enabled: true };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      } else {
        alert("Invalid verification code");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // HTML5 Drag and Drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadSingleFile(e.dataTransfer.files[0]);
    }
  };

  const uploadSingleFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(20);
    
    // Animate progress bar
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/files/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (res.ok) {
        refreshFiles();
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 800);
      } else {
        throw new Error("API upload failed");
      }
    } catch (err) {
      // Offline fallback simulator
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        const mockFile = {
          id: Math.random().toString(),
          filename: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          is_favorite: false,
          created_at: new Date().toISOString()
        };
        setUploadedFiles(prev => [mockFile, ...prev]);
      }, 500);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await uploadSingleFile(e.target.files[0]);
  };


  // Conversion trigger
  const handleTriggerConversion = async () => {
    if (!selectedFileId) {
      alert("Please select a file to convert.");
      return;
    }
    const fileToConvert = uploadedFiles.find(f => f.id === selectedFileId);
    if (!fileToConvert) return;

    const queueId = Math.random().toString();
    const newQueueItem = {
      id: queueId,
      filename: fileToConvert.filename,
      target: targetFormat,
      status: 'Processing',
      progress: 20
    };
    setConversionQueue(prev => [newQueueItem, ...prev]);

    // FastAPI triggers
    try {
      const res = await fetch(`${API_BASE}/convert/trigger?source_doc_id=${selectedFileId}&target_format=${targetFormat}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const result = await res.json();
        // Update task tracking loops
        pollConversionStatus(result.id, queueId);
        return;
      }
    } catch (e) {
      console.log("Offline mode - Running mock conversion animation");
    }

    // Mock animation loop
    let progress = 20;
    const interval = setInterval(() => {
      progress += 20;
      setConversionQueue(prev => 
        prev.map(item => item.id === queueId ? { ...item, progress: Math.min(progress, 100) } : item)
      );

      if (progress >= 100) {
        clearInterval(interval);
        setConversionQueue(prev => 
          prev.map(item => item.id === queueId ? { ...item, status: 'Completed' } : item)
        );
        
        // Add converted mock doc
        const mockConvertedDoc = {
          id: Math.random().toString(),
          filename: `converted_${fileToConvert.filename.rsplit ? fileToConvert.filename.rsplit('.', 1)[0] : 'file'}.${targetFormat.toLowerCase()}`,
          file_size: fileToConvert.file_size * 0.85,
          mime_type: `application/${targetFormat.toLowerCase()}`,
          is_favorite: false,
          created_at: new Date().toISOString()
        };
        setUploadedFiles(prev => [mockConvertedDoc, ...prev]);
      }
    }, 600);
  };

  const pollConversionStatus = (convId: string, queueId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/convert/status/${convId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'completed') {
            clearInterval(interval);
            setConversionQueue(prev => 
              prev.map(item => item.id === queueId ? { ...item, status: 'Completed', progress: 100 } : item)
            );
            refreshFiles();
          } else if (data.status === 'failed') {
            clearInterval(interval);
            setConversionQueue(prev => 
              prev.map(item => item.id === queueId ? { ...item, status: 'Failed', progress: 100 } : item)
            );
            alert(`Conversion failed: ${data.error_message}`);
          }
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 1500);
  };

  // Toggle Favorite
  const handleToggleFavorite = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/files/favorite/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUploadedFiles(prev => 
          prev.map(f => f.id === id ? { ...f, is_favorite: data.is_favorite } : f)
        );
      }
    } catch (e) {
      setUploadedFiles(prev => 
        prev.map(f => f.id === id ? { ...f, is_favorite: !f.is_favorite } : f)
      );
    }
  };

  // OCR Upload handler
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setOcrLoading(true);
    setOcrText('');
    setOcrResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = ocrType === 'invoice' ? 'invoice' : ocrType === 'businesscard' ? 'businesscard' : 'image';
      const res = await fetch(`${API_BASE}/ocr/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setOcrText(data.text);
        if (data.invoice_details) setOcrResults(data.invoice_details);
        if (data.contact_details) setOcrResults(data.contact_details);
      } else {
        throw new Error("OCR failure");
      }
    } catch (err) {
      // Mock OCR response fallback
      setTimeout(() => {
        if (ocrType === 'invoice') {
          setOcrText("ACME CORP INVOICE\nInvoice #INV-90210\nDate: 12/04/2026\nTotal Due: $450.00\nThank you for your business.");
          setOcrResults({ invoice_number: 'INV-90210', date: '12/04/2026', total_amount: '450.00', vendor: 'ACME CORP' });
        } else if (ocrType === 'businesscard') {
          setOcrText("Tony Stark\nCEO, Stark Industries\nEmail: tony@stark.com\nPhone: (555) 019-9921\nwww.starkindustries.com");
          setOcrResults({ name: 'Tony Stark', email: 'tony@stark.com', phone: '(555) 019-9921', website: 'www.starkindustries.com' });
        } else {
          setOcrText("Extracted raw text from image:\nThis is a standard text recognition output. Cosmos Convert uses Tesseract-OCR engines internally for fast offline document parses.");
        }
        setOcrLoading(false);
      }, 1200);
    } finally {
      setOcrLoading(false);
    }
  };

  // AI Chat Client
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setAiLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/chat?message=${encodeURIComponent(userMsg)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        throw new Error();
      }
    } catch (e) {
      // Mock Response
      setTimeout(() => {
        setChatHistory(prev => [...prev, { 
          sender: 'ai', 
          text: `I received: "${userMsg}". As a mock AI engine assistant, I suggest checking out our conversion tools in the dashboard tab.` 
        }]);
        setAiLoading(false);
      }, 600);
    } finally {
      setAiLoading(false);
    }
  };

  // Team sharing members invitation
  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setWorkspaceMembers(prev => [...prev, { email: inviteEmail, role: inviteRole }]);
    setInviteEmail('');
    alert(`Invite sent to ${inviteEmail} with role ${inviteRole}`);
  };

  // Mock Stripe checkout
  const handleBillingCheckout = async (plan: string) => {
    try {
      const res = await fetch(`${API_BASE}/billing/mock-checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ plan_type: plan, payment_method: 'stripe' })
      });
      const data = await res.json();
      alert(data.message);
    } catch (e) {
      alert(`Checkout simulated: Subscribed to ${plan.toUpperCase()} successfully.`);
    }
  };

  // PDF tools logic
  const handlePdfMerge = async () => {
    if (selectedPdfIds.length < 2) {
      alert("Please select at least 2 PDF files to merge.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/pdf/merge`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(selectedPdfIds)
      });
      if (res.ok) {
        alert("PDFs merged successfully!");
        refreshFiles();
      }
    } catch (e) {
      alert("Offline Merge simulated. Created 'merged_documents.pdf' in history.");
      const mockMerged = {
        id: Math.random().toString(),
        filename: 'merged_documents.pdf',
        file_size: 1520000,
        mime_type: 'application/pdf',
        is_favorite: false,
        created_at: new Date().toISOString()
      };
      setUploadedFiles(prev => [mockMerged, ...prev]);
    }
  };

  const handleAddWatermark = async () => {
    if (!selectedFileId || !watermarkText) {
      alert("Select a PDF and input watermark text.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/pdf/watermark?file_id=${selectedFileId}&text=${encodeURIComponent(watermarkText)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        alert("Watermark added successfully!");
        refreshFiles();
      }
    } catch (e) {
      alert("Offline Watermark simulation completed.");
      const mockWatermarked = {
        id: Math.random().toString(),
        filename: 'watermarked_document.pdf',
        file_size: 1040000,
        mime_type: 'application/pdf',
        is_favorite: false,
        created_at: new Date().toISOString()
      };
      setUploadedFiles(prev => [mockWatermarked, ...prev]);
    }
  };

  // --- DOCUMENT EDITOR HELPERS ---
  const handleEditorSave = async () => {
    if (!authToken) {
      alert("Please login to save files.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/editor/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: editorTitle,
          content: editorContent
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Document '${editorTitle}' auto-saved successfully.`);
        refreshFiles();
      } else {
        throw new Error();
      }
    } catch (e) {
      alert("Offline mode: Document draft auto-saved to memory.");
    }
  };

  const handleEditorExport = async (format: string) => {
    if (!authToken) {
      alert("Please login to export files.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/editor/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: editorTitle,
          content: editorContent,
          export_format: format
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Export completed! '${data.filename}' added to workspace.`);
        refreshFiles();
        // Trigger download
        const dRes = await fetch(`${API_BASE}/files/download/${data.id}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (dRes.ok) {
          const blob = await dRes.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.filename;
          a.click();
        }
      } else {
        throw new Error();
      }
    } catch (e) {
      // Mock Download Fallback
      alert(`Offline mode export simulated: ${editorTitle}.${format.toLowerCase()} downloaded.`);
      const blob = new Blob([editorContent], { type: format === 'TXT' ? 'text/plain' : 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${editorTitle}.${format.toLowerCase()}`;
      a.click();
    }
  };

  // --- EXTENDED PDF TOOLKIT HELPERS ---
  const handlePdfSplit = async (fileId: string) => {
    try {
      const res = await fetch(`${API_BASE}/pdf/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ file_id: fileId, output_name: "split_pages.zip" })
      });
      if (res.ok) {
        alert("PDF split successfully! ZIP containing pages added to storage.");
        refreshFiles();
      } else { throw new Error(); }
    } catch (e) {
      alert("Offline simulation: PDF split. Added 'split_pages.zip' to storage.");
      const mockZip = {
        id: Math.random().toString(),
        filename: 'split_pages.zip',
        file_size: 450000,
        mime_type: 'application/zip',
        is_favorite: false,
        created_at: new Date().toISOString()
      };
      setUploadedFiles(prev => [mockZip, ...prev]);
    }
  };

  const handlePdfCompress = async (fileId: string) => {
    try {
      const res = await fetch(`${API_BASE}/pdf/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ file_id: fileId, output_name: "compressed.pdf" })
      });
      if (res.ok) {
        alert("PDF compressed successfully!");
        refreshFiles();
      } else { throw new Error(); }
    } catch (e) {
      alert("Offline simulation: PDF compressed. Added 'compressed.pdf' to storage.");
      const mock = {
        id: Math.random().toString(),
        filename: 'compressed_document.pdf',
        file_size: 120000,
        mime_type: 'application/pdf',
        is_favorite: false,
        created_at: new Date().toISOString()
      };
      setUploadedFiles(prev => [mock, ...prev]);
    }
  };

  const handlePdfProtect = async (fileId: string, pass: string) => {
    if (!pass) { alert("Enter a protection password"); return; }
    try {
      const res = await fetch(`${API_BASE}/pdf/protect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ file_id: fileId, password: pass, output_name: "protected.pdf" })
      });
      if (res.ok) {
        alert("PDF locked and encrypted!");
        refreshFiles();
      } else { throw new Error(); }
    } catch (e) {
      alert("Offline simulation: PDF encrypted with password. Added 'protected.pdf' to storage.");
      const mock = {
        id: Math.random().toString(),
        filename: 'protected.pdf',
        file_size: 204000,
        mime_type: 'application/pdf',
        is_favorite: false,
        created_at: new Date().toISOString()
      };
      setUploadedFiles(prev => [mock, ...prev]);
    }
  };

  const handlePdfUnlock = async (fileId: string, pass: string) => {
    if (!pass) { alert("Enter decryption password"); return; }
    try {
      const res = await fetch(`${API_BASE}/pdf/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ file_id: fileId, password: pass, output_name: "unlocked.pdf" })
      });
      if (res.ok) {
        alert("PDF decrypted successfully!");
        refreshFiles();
      } else { throw new Error(); }
    } catch (e) {
      alert("Offline simulation: PDF decrypted. Added 'unlocked.pdf' to storage.");
      const mock = {
        id: Math.random().toString(),
        filename: 'unlocked.pdf',
        file_size: 198000,
        mime_type: 'application/pdf',
        is_favorite: false,
        created_at: new Date().toISOString()
      };
      setUploadedFiles(prev => [mock, ...prev]);
    }
  };

  const handlePdfRotate = async (fileId: string, angle: number) => {
    try {
      const res = await fetch(`${API_BASE}/pdf/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ file_id: fileId, rotation_angle: angle, output_name: "rotated.pdf" })
      });
      if (res.ok) {
        alert("PDF pages rotated!");
        refreshFiles();
      } else { throw new Error(); }
    } catch (e) {
      alert(`Offline simulation: PDF rotated by ${angle} degrees.`);
      refreshFiles();
    }
  };

  const handlePdfDeletePages = async (fileId: string, pagesStr: string) => {
    const pagesToDelete = pagesStr.split(',').map(x => parseInt(x.trim()) - 1).filter(x => !isNaN(x));
    if (pagesToDelete.length === 0) { alert("Invalid page format. Use comma separated e.g. 1,3,4"); return; }
    try {
      const res = await fetch(`${API_BASE}/pdf/delete-pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ file_id: fileId, pages_to_delete: pagesToDelete, output_name: "deleted_pages.pdf" })
      });
      if (res.ok) {
        alert("PDF pages deleted!");
        refreshFiles();
      } else { throw new Error(); }
    } catch (e) {
      alert(`Offline simulation: Pages ${pagesStr} deleted from PDF.`);
      refreshFiles();
    }
  };

  // --- EXTENDED IMAGE TOOLKIT HELPERS ---
  const handleImageResize = async (fileId: string, w: number, h: number) => {
    try {
      const res = await fetch(`${API_BASE}/image/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ file_id: fileId, width: w, height: h, output_name: "resized.png" })
      });
      if (res.ok) {
        alert("Image resized successfully!");
        refreshFiles();
      } else { throw new Error(); }
    } catch (e) {
      alert(`Offline simulation: Image resized to ${w}x${h}.`);
      refreshFiles();
    }
  };

  const handleImageAdjust = async (fileId: string, brightness: number, contrast: number, filterName: string) => {
    try {
      const res = await fetch(`${API_BASE}/image/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({
          file_id: fileId,
          brightness: brightness,
          contrast: contrast,
          filter_name: filterName,
          output_name: "adjusted.png"
        })
      });
      if (res.ok) {
        alert("Image adjustments applied!");
        refreshFiles();
      } else { throw new Error(); }
    } catch (e) {
      alert(`Offline simulation: Adjustments applied (Brightness: ${brightness}, Contrast: ${contrast}, Filter: ${filterName}).`);
      refreshFiles();
    }
  };

  const handleImageRemoveBackground = async (fileId: string) => {
    try {
      const res = await fetch(`${API_BASE}/image/background-remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ file_id: fileId, output_name: "bg_removed.png" })
      });
      if (res.ok) {
        alert("Background removed!");
        refreshFiles();
      } else { throw new Error(); }
    } catch (e) {
      alert("Offline simulation: Transparent background mask applied. Added 'bg_removed.png'.");
      const mock = {
        id: Math.random().toString(),
        filename: 'bg_removed.png',
        file_size: 90000,
        mime_type: 'image/png',
        is_favorite: false,
        created_at: new Date().toISOString()
      };
      setUploadedFiles(prev => [mock, ...prev]);
    }
  };

  const handleImageEnhance = async (fileId: string) => {
    try {
      const res = await fetch(`${API_BASE}/image/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ file_id: fileId, output_name: "enhanced.png" })
      });
      if (res.ok) {
        alert("Image enhanced!");
        refreshFiles();
      } else { throw new Error(); }
    } catch (e) {
      alert("Offline simulation: Histogram contrast & sharp equalizers applied.");
      refreshFiles();
    }
  };

  // Set selected file utility
  const togglePdfSelection = (id: string) => {
    setSelectedPdfIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Filter languages in searchable dropdown
  const filteredLanguages = LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <div className={`relative min-h-screen selection:bg-teal-500 selection:text-white transition-all duration-300 theme-${theme} ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'} ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      
      {/* Background Animated Nebulas and Stars (Galaxy Theme) */}
      {theme === 'galaxy' && <div className="cosmic-nebula" />}
      {(theme === 'galaxy' || theme === 'space') && (
        <div className="stars-container">
          {[...Array(60)].map((_, i) => (
            <div 
              key={i} 
              className="star" 
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 3}px`,
                height: `${Math.random() * 3}px`,
                '--duration': `${2 + Math.random() * 5}s`,
                '--delay': `${Math.random() * 5}s`,
                '--opacity': `${0.3 + Math.random() * 0.7}`
              } as any}
            />
          ))}
        </div>
      )}

      {/* Floating Graphic Planets (Theme Specific Element) */}
      {(theme === 'galaxy' || theme === 'space') && (
        <>
          <div className="fixed -top-20 -right-20 w-80 h-80 rounded-full cosmic-planet-purple opacity-30 float-animation pointer-events-none z-[-1]" />
          <div className="fixed bottom-10 left-10 w-60 h-60 rounded-full cosmic-planet-teal opacity-20 float-reverse pointer-events-none z-[-1]" />
        </>
      )}


      {/* TOP NAVIGATION BAR */}
      <nav className="glass-panel sticky top-0 z-50 border-b border-white/5 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-purple-600 to-teal-400 p-2 rounded-lg text-white font-bold float-animation">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-white via-purple-300 to-teal-300 bg-clip-text text-transparent">
              COSMOS CONVERT
            </span>
            <span className="block text-[9px] tracking-widest text-teal-400 font-bold uppercase">SaaS + Desktop App</span>
          </div>
        </div>

        {/* Navigation Tabs (Dashboard specific tabs visible if user authenticated) */}
        {user && (
          <div className="hidden md:flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-purple-600/40 text-white border border-purple-500/30' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 inline-block mr-1.5 align-text-bottom" />
              {t('dashboard')}
            </button>
            <button 
              onClick={() => setActiveTab('editor')} 
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${activeTab === 'editor' ? 'bg-purple-600/40 text-white border border-purple-500/30' : 'text-slate-400 hover:text-white'}`}
            >
              <FileText className="w-3.5 h-3.5 inline-block mr-1.5 align-text-bottom" />
              {t('editor')}
            </button>
            <button 
              onClick={() => setActiveTab('image')} 
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${activeTab === 'image' ? 'bg-purple-600/40 text-white border border-purple-500/30' : 'text-slate-400 hover:text-white'}`}
            >
              <ImageIcon className="w-3.5 h-3.5 inline-block mr-1.5 align-text-bottom" />
              {t('imageEditor')}
            </button>
            <button 
              onClick={() => setActiveTab('ocr')} 
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${activeTab === 'ocr' ? 'bg-purple-600/40 text-white border border-purple-500/30' : 'text-slate-400 hover:text-white'}`}
            >
              <Cpu className="w-3.5 h-3.5 inline-block mr-1.5 align-text-bottom" />
              {t('ocrTitle')}
            </button>
            <button 
              onClick={() => setActiveTab('billing')} 
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${activeTab === 'billing' ? 'bg-purple-600/40 text-white border border-purple-500/30' : 'text-slate-400 hover:text-white'}`}
            >
              <CreditCard className="w-3.5 h-3.5 inline-block mr-1.5 align-text-bottom" />
              {t('billing')}
            </button>
            {user.is_superuser && (
              <button 
                onClick={() => setActiveTab('admin')} 
                className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${activeTab === 'admin' ? 'bg-purple-600/40 text-white border border-purple-500/30' : 'text-slate-400 hover:text-white'}`}
              >
                <ShieldAlert className="w-3.5 h-3.5 inline-block mr-1.5 align-text-bottom" />
                {t('admin')}
              </button>
            )}
          </div>
        )}

        {/* Language, Theme Selector and Login buttons */}
        <div className="flex items-center gap-4">
          
          {/* SEARCHABLE LANGUAGE DROP-DOWN SELECTOR */}
          <div className="relative">
            <button 
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            >
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>{LANGUAGES.find(l => l.code === lang)?.flag}</span>
              <span className="hidden sm:inline">{LANGUAGES.find(l => l.code === lang)?.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 glass-panel rounded-xl shadow-xl border border-white/10 p-2 z-[60] backdrop-blur-xl">
                <div className="flex items-center gap-2 px-2 py-1 mb-2 border-b border-white/5">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search languages..." 
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 py-1"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredLanguages.map(l => (
                    <button
                      key={l.code}
                      onClick={() => handleLanguageChange(l.code)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition ${lang === l.code ? 'bg-purple-600/30 text-teal-400 font-bold border border-purple-500/20' : 'hover:bg-white/5 text-slate-300'}`}
                    >
                      <span>{l.flag} &nbsp; {l.name}</span>
                      {lang === l.code && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme switcher */}
          <div className="hidden sm:flex items-center bg-white/5 border border-white/10 rounded-lg p-1">
            <button 
              onClick={() => setTheme('galaxy')} 
              className={`p-1.5 rounded-md transition ${theme === 'galaxy' ? 'bg-purple-600/40 text-teal-300' : 'text-slate-400 hover:text-white'}`}
              title="Galaxy Theme"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setTheme('dark')} 
              className={`p-1.5 rounded-md transition ${theme === 'dark' ? 'bg-purple-600/40 text-teal-300' : 'text-slate-400 hover:text-white'}`}
              title="Dark Theme"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setTheme('light')} 
              className={`p-1.5 rounded-md transition ${theme === 'light' ? 'bg-purple-600/40 text-teal-300' : 'text-slate-400 hover:text-white'}`}
              title="Light Theme"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden lg:block text-right">
                <span className="block text-xs font-bold text-teal-300">{user.full_name}</span>
                <span className="block text-[9px] text-slate-400">{user.email}</span>
              </div>
              <button 
                onClick={handleLogout} 
                className="bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t('logout')}</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setAuthTab('login')} 
              className="bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-500 hover:to-teal-400 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-purple-500/20"
            >
              {t('login')}
            </button>
          )}

        </div>
      </nav>

      {/* LANDING PAGE HERO AND PRICING (Visible if NOT Logged In) */}
      {!user ? (
        <main className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
            
            {/* Left Hero Message */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-purple-600/20 border border-purple-500/30 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-300 float-animation">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cosmic Suite - Multi-Platform App (Tauri Enabled)</span>
              </div>
              
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-white via-slate-200 to-purple-200 bg-clip-text text-transparent">
                {t('heroTitle')}
              </h1>
              
              <p className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed">
                {t('heroSubtitle')}
              </p>

              {/* Mock Auth trigger actions */}
              <div className="flex flex-wrap gap-4 pt-4">
                <button 
                  onClick={() => handleOAuthLogin('google')} 
                  className="glass-panel glass-panel-hover flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold text-white transition cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-purple-400" />
                  <span>Google Sign In</span>
                </button>
                <button 
                  onClick={() => handleOAuthLogin('github')} 
                  className="glass-panel glass-panel-hover flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold text-white transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>GitHub Access</span>
                </button>
              </div>

              {/* Local Credentials form trigger */}
              <div className="glass-panel p-6 rounded-2xl max-w-md border border-white/5 space-y-4">
                <div className="flex border-b border-white/10 pb-2 mb-2">
                  <button 
                    onClick={() => setAuthTab('login')} 
                    className={`flex-1 text-center py-2 text-sm font-bold transition ${authTab === 'login' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    {t('login')}
                  </button>
                  <button 
                    onClick={() => setAuthTab('signup')} 
                    className={`flex-1 text-center py-2 text-sm font-bold transition ${authTab === 'signup' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    {t('signup')}
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3">
                  {authTab === 'signup' && (
                    <input 
                      type="text" 
                      placeholder="Full Name" 
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full px-4 py-2 text-sm glass-input"
                      required
                    />
                  )}
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-4 py-2 text-sm glass-input"
                    required
                  />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-4 py-2 text-sm glass-input"
                    required
                  />

                  {requires2FA && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <span className="block text-xs font-semibold text-yellow-300">Enter 2FA Code</span>
                      <input 
                        type="text" 
                        placeholder="6-digit Authenticator Code" 
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        className="w-full px-4 py-2 text-sm glass-input text-center tracking-widest font-mono"
                        maxLength={6}
                        required
                      />
                    </div>
                  )}

                  {authError && (
                    <div className="text-red-400 text-xs font-semibold bg-red-500/10 p-2 rounded border border-red-500/20">
                      {authError}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition mt-2 shadow-lg shadow-purple-500/20"
                  >
                    {authTab === 'login' ? 'Launch Workspace' : 'Submit Credentials'}
                  </button>

                  {authTab === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => handleDemoLogin('dashboard')}
                      className="w-full py-2.5 bg-teal-500/20 hover:bg-teal-500/35 text-teal-300 rounded-xl text-xs font-bold transition mt-2 border border-teal-500/30 shadow-lg"
                    >
                      🚀 Launch Quick Demo Workspace
                    </button>
                  )}
                </form>

              </div>

            </div>

            {/* Right Feature Cards & Live statistics display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={() => handleDemoLogin('dashboard')}
                className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-purple-500/30 transition float-animation cursor-pointer"
              >
                <FileText className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="font-bold text-sm text-white">Document Conversion</h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">PDF, DOCX, TXT, HTML, PPTX, XLSX cross conversions.</p>
              </div>

              <div 
                onClick={() => handleDemoLogin('image')}
                className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-teal-500/30 transition float-reverse cursor-pointer"
              >
                <ImageIcon className="w-8 h-8 text-teal-400 mb-3" />
                <h3 className="font-bold text-sm text-white">Image Editor Suite</h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">Crop, resize, apply stellar filters, convert to WEBP, PNG, SVG.</p>
              </div>

              <div 
                onClick={() => handleDemoLogin('ocr')}
                className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-teal-500/30 transition float-reverse cursor-pointer"
              >
                <Cpu className="w-8 h-8 text-teal-400 mb-3" />
                <h3 className="font-bold text-sm text-white">Offline OCR engine</h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">Local scanned document parses, invoices structures, business cards.</p>
              </div>

              <div 
                onClick={() => handleDemoLogin('editor')}
                className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-purple-500/30 transition float-animation cursor-pointer"
              >
                <Sparkles className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="font-bold text-sm text-white">Cosmic AI Writer</h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">TipTap integrated word processing with real-time markdown exports.</p>
              </div>
            </div>


          </div>

          {/* Pricing Showcase Section */}
          <div className="py-16 border-t border-white/5">
            <h2 className="text-center text-3xl font-extrabold bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent mb-12">
              Flexible Space-Plan Pricing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              
              {/* Free Plan */}
              <div className="glass-panel p-8 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Free Explorer</span>
                  <h3 className="text-3xl font-extrabold text-white mt-2">$0</h3>
                  <p className="text-slate-400 text-xs mt-2">Basic file formatting operations</p>
                  <ul className="space-y-2 mt-6 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>5 free conversions / day</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Local storage only</span>
                    </li>
                  </ul>
                </div>
                <button 
                  onClick={() => setAuthTab('login')}
                  className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-lg mt-8 transition"
                >
                  Start Converting
                </button>
              </div>

              {/* Pro Plan */}
              <div className="glass-panel p-8 rounded-2xl border-2 border-purple-500 flex flex-col justify-between relative shadow-lg shadow-purple-500/10">
                <div className="absolute -top-3 right-4 bg-teal-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px]">MOST POPULAR</div>
                <div>
                  <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">Orbit Pro</span>
                  <h3 className="text-3xl font-extrabold text-white mt-2">$9.99<span className="text-xs font-normal text-slate-400">/mo</span></h3>
                  <p className="text-slate-400 text-xs mt-2">Perfect for creators and developers</p>
                  <ul className="space-y-2 mt-6 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Unlimited file conversions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>High performance OCR engine</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>AI summarizes & translator</span>
                    </li>
                  </ul>
                </div>
                <button 
                  onClick={() => setAuthTab('login')}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-500 hover:to-teal-400 text-white text-xs font-bold rounded-lg mt-8 transition"
                >
                  Get Pro Orbit
                </button>
              </div>

              {/* Business Plan */}
              <div className="glass-panel p-8 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Galaxy Enterprise</span>
                  <h3 className="text-3xl font-extrabold text-white mt-2">Custom</h3>
                  <p className="text-slate-400 text-xs mt-2">Scalable solutions for corporations</p>
                  <ul className="space-y-2 mt-6 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Dedicated conversion threads</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Custom API integrations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>Priority support SLAs</span>
                    </li>
                  </ul>
                </div>
                <button 
                  onClick={() => setAuthTab('login')}
                  className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-lg mt-8 transition"
                >
                  Contact Sales
                </button>
              </div>

            </div>
          </div>

        </main>
      ) : (
        /* ================= AUTHENTICATED PORTAL VIEW ================= */
        <main className="max-w-7xl mx-auto px-6 py-8">
          
          {/* TAB CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Dashboard Sidebar Navigation (Mobile Friendly) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="glass-panel p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3 pb-3 border-b border-white/5 mb-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600/40 border border-purple-500/30 flex items-center justify-center font-bold text-teal-300">
                    {user.full_name[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white">{user.full_name}</span>
                    <span className="block text-[10px] text-slate-400">Orbit Plan: <strong className="text-teal-400">FREE</strong></span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <button 
                    onClick={() => setActiveTab('dashboard')} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${activeTab === 'dashboard' ? 'bg-purple-600/30 text-white border border-purple-500/20' : 'text-slate-400 hover:bg-white/5'}`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-teal-400" />
                    <span>User Workspace</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('editor')} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${activeTab === 'editor' ? 'bg-purple-600/30 text-white border border-purple-500/20' : 'text-slate-400 hover:bg-white/5'}`}
                  >
                    <FileText className="w-4 h-4 text-teal-400" />
                    <span>TipTap Doc Editor</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('image')} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${activeTab === 'image' ? 'bg-purple-600/30 text-white border border-purple-500/20' : 'text-slate-400 hover:bg-white/5'}`}
                  >
                    <ImageIcon className="w-4 h-4 text-teal-400" />
                    <span>Stellar Image Editor</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('ocr')} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${activeTab === 'ocr' ? 'bg-purple-600/30 text-white border border-purple-500/20' : 'text-slate-400 hover:bg-white/5'}`}
                  >
                    <Cpu className="w-4 h-4 text-teal-400" />
                    <span>AI OCR Parser</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('billing')} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${activeTab === 'billing' ? 'bg-purple-600/30 text-white border border-purple-500/20' : 'text-slate-400 hover:bg-white/5'}`}
                  >
                    <CreditCard className="w-4 h-4 text-teal-400" />
                    <span>Billing & Subscriptions</span>
                  </button>
                  {user.is_superuser && (
                    <button 
                      onClick={() => setActiveTab('admin')} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left ${activeTab === 'admin' ? 'bg-purple-600/30 text-white border border-purple-500/20' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                      <ShieldAlert className="w-4 h-4 text-teal-400" />
                      <span>Admin Stats Console</span>
                    </button>
                  )}
                </div>
              </div>

              {/* STORAGE USAGE CONTROLLER */}
              <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                <span className="block text-xs font-bold text-slate-300">Space Storage Limit</span>
                <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-teal-400 h-full rounded-full" style={{ width: '45%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>45 MB Used</span>
                  <span>100 MB Limit</span>
                </div>
              </div>

              {/* SECURITY SETTINGS / 2FA MOCK IN SIDEBAR */}
              <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold text-white">Security Center</span>
                </div>
                {user.two_factor_enabled ? (
                  <div className="flex items-center gap-1.5 text-xs text-teal-400 font-bold bg-teal-500/10 p-2 rounded border border-teal-500/20">
                    <CheckCircle className="w-4 h-4" />
                    <span>2FA Protected</span>
                  </div>
                ) : (
                  <div>
                    <span className="block text-[10px] text-slate-400 mb-2">Enable Two-Factor authentication to secure your space credentials.</span>
                    {!totpSetup ? (
                      <button 
                        onClick={handleSetup2FA} 
                        className="w-full py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-[10px] font-bold rounded-lg border border-yellow-500/30 transition"
                      >
                        Activate 2FA
                      </button>
                    ) : (
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <img src={totpSetup.qr_code_url} alt="QR Code" className="w-24 h-24 mx-auto border border-white/10 rounded" />
                        <input 
                          type="text" 
                          placeholder="Verify OTP" 
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs glass-input text-center font-mono"
                          maxLength={6}
                        />
                        <button 
                          onClick={handleVerify2FA} 
                          className="w-full py-1.5 bg-teal-600 text-white text-[10px] font-bold rounded-lg transition"
                        >
                          Confirm Enable
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Main Interactive Screen Content */}
            <div className="lg:col-span-9 space-y-8">
              
              {/* TAB 1: WORKSPACE DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  
                  {/* File Upload Zone with HTML5 Drag & Drop */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`glass-panel p-8 rounded-3xl border transition-all duration-200 text-center relative overflow-hidden ${dragActive ? 'border-teal-400 bg-teal-500/10 shadow-lg shadow-teal-500/10' : 'border-white/10'}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-teal-500/5 pointer-events-none" />

                    <UploadCloud className="w-12 h-12 text-teal-400 mx-auto mb-4 float-animation" />
                    <h2 className="text-xl font-bold text-white mb-2">Upload Files & Transform Formats</h2>
                    <p className="text-slate-400 text-xs max-w-md mx-auto mb-6">
                      Drag & Drop files, PDFs, invoices, code, or images. Supports files size limits up to 25MB.
                    </p>

                    <label className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-500 hover:to-teal-400 px-6 py-3 rounded-xl text-xs font-bold text-white cursor-pointer transition shadow-lg shadow-purple-500/20">
                      <UploadCloud className="w-4 h-4" />
                      <span>Select Files</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleFileUpload} 
                      />
                    </label>

                    {isUploading && (
                      <div className="max-w-xs mx-auto mt-6 space-y-2">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-teal-400 h-full rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Multi format converter controls */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div>
                      <span className="block text-xs font-bold text-slate-300 mb-2">1. Select Input File</span>
                      <select 
                        value={selectedFileId} 
                        onChange={(e) => setSelectedFileId(e.target.value)}
                        className="w-full px-3 py-2 text-xs glass-input"
                      >
                        <option value="">-- Choose file from storage --</option>
                        {uploadedFiles.map(f => (
                          <option key={f.id} value={f.id}>{f.filename}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="block text-xs font-bold text-slate-300 mb-2">2. Convert Target Format</span>
                      <select 
                        value={targetFormat} 
                        onChange={(e) => setTargetFormat(e.target.value)}
                        className="w-full px-3 py-2 text-xs glass-input"
                      >
                        <option value="PDF">PDF (Document)</option>
                        <option value="DOCX">DOCX (Microsoft Word)</option>
                        <option value="TXT">TXT (Plain Text)</option>
                        <option value="HTML">HTML (Webpage)</option>
                        <option value="PNG">PNG (Image)</option>
                        <option value="JPG">JPG (Image)</option>
                        <option value="WEBP">WEBP (Image)</option>
                      </select>
                    </div>

                    <div>
                      <span className="block text-xs font-bold text-transparent select-none mb-2">3. Trigger Action</span>
                      <button 
                        onClick={handleTriggerConversion}
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-500/10"
                      >
                        Launch Celestial Conversion
                      </button>
                    </div>
                  </div>

                  {/* Active Conversion Queue */}
                  {conversionQueue.length > 0 && (
                    <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-400" />
                        <span>Conversion Processing Queue</span>
                      </h3>
                      <div className="space-y-3">
                        {conversionQueue.map(item => (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                            <div>
                              <span className="block text-xs font-bold text-white">{item.filename}</span>
                              <span className="block text-[10px] text-slate-400">Targeting: <strong className="text-teal-300">{item.target}</strong></span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${item.status === 'Completed' ? 'bg-teal-500/20 text-teal-300' : item.status === 'Failed' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                {item.status}
                              </span>
                              <div className="w-24 bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-teal-400 h-full transition-all" style={{ width: `${item.progress}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advanced PDF Utilities section */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="text-sm font-bold text-white">Advanced PDF Toolbox</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Merge PDFs panel */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 flex flex-col justify-between">
                        <div>
                          <span className="block text-xs font-bold text-purple-300">Merge Multiple PDFs</span>
                          <span className="block text-[10px] text-slate-400 mb-2">Select PDFs below to combine:</span>
                          <div className="max-h-24 overflow-y-auto space-y-1.5 border border-white/5 p-2 rounded bg-black/10">
                            {uploadedFiles.filter(f => f.filename.toLowerCase().endsWith('.pdf')).map(f => (
                              <label key={f.id} className="flex items-center gap-2 text-[10px] text-slate-300 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={selectedPdfIds.includes(f.id)} 
                                  onChange={() => togglePdfSelection(f.id)} 
                                />
                                <span className="truncate max-w-[150px]">{f.filename}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <button 
                          onClick={handlePdfMerge}
                          className="w-full py-1.5 bg-purple-600/40 hover:bg-purple-600/60 text-white rounded text-[11px] font-bold border border-purple-500/20 transition mt-2"
                        >
                          Merge PDFs ({selectedPdfIds.length})
                        </button>
                      </div>

                      {/* Split PDF panel */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 flex flex-col justify-between">
                        <div>
                          <span className="block text-xs font-bold text-purple-300">Split PDF Pages</span>
                          <span className="block text-[10px] text-slate-400">Extracts pages and packages them into a ZIP archive.</span>
                          <p className="text-[10px] text-slate-500 mt-2">Target File: <strong className="text-teal-400">{uploadedFiles.find(f => f.id === selectedFileId)?.filename || "Select file above"}</strong></p>
                        </div>
                        <button 
                          onClick={() => selectedFileId ? handlePdfSplit(selectedFileId) : alert("Please select a PDF file first")}
                          className="w-full py-1.5 bg-purple-600/40 hover:bg-purple-600/60 text-white rounded text-[11px] font-bold border border-purple-500/20 transition"
                        >
                          Split Selected PDF
                        </button>
                      </div>

                      {/* PDF Watermarking */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 flex flex-col justify-between">
                        <div>
                          <span className="block text-xs font-bold text-purple-300">Apply Watermark</span>
                          <span className="block text-[10px] text-slate-400 mb-2">Target: <strong className="text-teal-400">{uploadedFiles.find(f => f.id === selectedFileId)?.filename || "Select file above"}</strong></span>
                          <input 
                            type="text" 
                            placeholder="e.g. CONFIDENTIAL STARK" 
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            className="w-full px-3 py-1.5 text-[11px] glass-input"
                          />
                        </div>
                        <button 
                          onClick={handleAddWatermark}
                          className="w-full py-1.5 bg-teal-600/40 hover:bg-teal-600/60 text-teal-300 rounded text-[11px] font-bold border border-teal-500/20 transition mt-2"
                        >
                          Watermark PDF
                        </button>
                      </div>

                      {/* PDF Security (Lock/Unlock) */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 flex flex-col justify-between">
                        <div>
                          <span className="block text-xs font-bold text-purple-300">PDF Password Security</span>
                          <span className="block text-[10px] text-slate-400 mb-2">Encrypt or decrypt PDF files.</span>
                          <input 
                            type="password" 
                            placeholder="Encryption Password" 
                            value={pdfPassword}
                            onChange={(e) => setPdfPassword(e.target.value)}
                            className="w-full px-3 py-1.5 text-[11px] glass-input mb-2"
                          />
                          <p className="text-[10px] text-slate-500">Target: <strong className="text-teal-400">{uploadedFiles.find(f => f.id === selectedFileId)?.filename || "Select file above"}</strong></p>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button 
                            onClick={() => selectedFileId ? handlePdfProtect(selectedFileId, pdfPassword) : alert("Select a file")}
                            className="w-1/2 py-1.5 bg-purple-600/40 hover:bg-purple-600/60 text-white rounded text-[10px] font-bold border border-purple-500/20 transition"
                          >
                            Encrypt
                          </button>
                          <button 
                            onClick={() => selectedFileId ? handlePdfUnlock(selectedFileId, pdfPassword) : alert("Select a file")}
                            className="w-1/2 py-1.5 bg-teal-600/40 hover:bg-teal-600/60 text-teal-300 rounded text-[10px] font-bold border border-teal-500/20 transition"
                          >
                            Decrypt
                          </button>
                        </div>
                      </div>

                      {/* PDF Page Operations */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 flex flex-col justify-between">
                        <div>
                          <span className="block text-xs font-bold text-purple-300">Page Operations</span>
                          <span className="block text-[10px] text-slate-400">Rotate or delete specific pages.</span>
                          <input 
                            type="text" 
                            placeholder="Pages to edit, e.g. 1, 3" 
                            value={pdfPagesInput}
                            onChange={(e) => setPdfPagesInput(e.target.value)}
                            className="w-full px-3 py-1.5 text-[11px] glass-input mb-2"
                          />
                          <div className="flex gap-2 items-center justify-between text-[11px]">
                            <span className="text-slate-400">Angle:</span>
                            <select 
                              value={pdfRotationAngle}
                              onChange={(e) => setPdfRotationAngle(Number(e.target.value))}
                              className="px-2 py-1 glass-input text-[11px]"
                            >
                              <option value="90">90° CW</option>
                              <option value="180">180°</option>
                              <option value="270">270° CCW</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button 
                            onClick={() => selectedFileId ? handlePdfRotate(selectedFileId, pdfRotationAngle) : alert("Select file")}
                            className="w-1/2 py-1.5 bg-purple-600/40 hover:bg-purple-600/60 text-white rounded text-[10px] font-bold border border-purple-500/20 transition"
                          >
                            Rotate Page
                          </button>
                          <button 
                            onClick={() => selectedFileId ? handlePdfDeletePages(selectedFileId, pdfPagesInput) : alert("Select file")}
                            className="w-1/2 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded text-[10px] font-bold border border-red-500/20 transition"
                          >
                            Delete Page
                          </button>
                        </div>
                      </div>

                      {/* Compress PDF */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 flex flex-col justify-between">
                        <div>
                          <span className="block text-xs font-bold text-purple-300">Compress PDF Size</span>
                          <span className="block text-[10px] text-slate-400">Compacts image streams and metadata inside PDF document.</span>
                          <p className="text-[10px] text-slate-500 mt-2">Target File: <strong className="text-teal-400">{uploadedFiles.find(f => f.id === selectedFileId)?.filename || "Select file above"}</strong></p>
                        </div>
                        <button 
                          onClick={() => selectedFileId ? handlePdfCompress(selectedFileId) : alert("Please select a PDF file first")}
                          className="w-full py-1.5 bg-teal-600/40 hover:bg-teal-600/60 text-teal-300 rounded text-[11px] font-bold border border-teal-500/20 transition mt-2"
                        >
                          Compress File Size
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Recent Documents list */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">{t('recentFiles')}</h3>
                      <button onClick={refreshFiles} className="text-xs text-teal-400 hover:underline">Refresh Files</button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-400">
                            <th className="py-2.5">File Name</th>
                            <th className="py-2.5">Format</th>
                            <th className="py-2.5">Size</th>
                            <th className="py-2.5">Uploaded</th>
                            <th className="py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {uploadedFiles.map(f => (
                            <tr key={f.id} className="hover:bg-white/5 transition">
                              <td className="py-3 font-semibold text-white flex items-center gap-2">
                                <button onClick={() => handleToggleFavorite(f.id)}>
                                  <Star className={`w-3.5 h-3.5 ${f.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500'}`} />
                                </button>
                                <span>{f.filename}</span>
                              </td>
                              <td className="py-3 text-teal-400 uppercase font-bold">{f.filename.split('.').pop()}</td>
                              <td className="py-3 text-slate-400">{(f.file_size / 1024).toFixed(1)} KB</td>
                              <td className="py-3 text-slate-400">{new Date(f.created_at).toLocaleDateString()}</td>
                              <td className="py-3 text-right">
                                <a 
                                  href={`${API_BASE}/files/download/${f.id}`} 
                                  download
                                  className="bg-white/5 border border-white/10 hover:bg-white/10 px-2.5 py-1.5 rounded text-[10px] font-bold text-white transition mr-2"
                                >
                                  Download
                                </a>
                              </td>
                            </tr>
                          ))}
                          {uploadedFiles.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-500">No documents found. Upload a file above to begin.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Team Workspace collaboration invite */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        <span>Team Space Workspaces</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <span className="block text-xs font-bold text-slate-300">Workspace Members</span>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {workspaceMembers.map((m, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 rounded bg-white/5 text-xs">
                              <span>{m.email}</span>
                              <span className="text-[10px] uppercase font-bold text-teal-400">{m.role}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <form onSubmit={handleInvite} className="space-y-3">
                        <span className="block text-xs font-bold text-slate-300">Invite Members</span>
                        <input 
                          type="email" 
                          placeholder="colleague@domain.com" 
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs glass-input"
                          required
                        />
                        <select 
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs glass-input"
                        >
                          <option value="editor">Editor (Access & Edit)</option>
                          <option value="viewer">Viewer (Read Only)</option>
                          <option value="admin">Administrator (Full Access)</option>
                        </select>
                        <button 
                          type="submit"
                          className="w-full py-2 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded text-xs font-bold transition"
                        >
                          Send Workspace Invitation
                        </button>
                      </form>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: RICH DOCUMENT EDITOR */}
              {activeTab === 'editor' && (
                <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <input 
                        type="text" 
                        value={editorTitle}
                        onChange={(e) => setEditorTitle(e.target.value)}
                        className="bg-transparent border-none text-xl font-extrabold text-white outline-none focus:ring-0"
                      />
                      <span className="block text-[10px] text-slate-400 mt-1">Rich TipTap Editor Sandbox</span>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={handleEditorSave}
                        className="bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/30 text-white px-3 py-1.5 rounded text-xs font-bold transition"
                      >
                        Save Project
                      </button>
                      <select 
                        onChange={(e) => {
                          if (e.target.value) {
                            handleEditorExport(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="bg-teal-600/40 hover:bg-teal-600/60 border border-teal-500/30 text-teal-300 px-3 py-1.5 rounded text-xs font-bold transition outline-none cursor-pointer"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">Export As...</option>
                        <option value="PDF" className="bg-slate-900 text-white">PDF Document</option>
                        <option value="DOCX" className="bg-slate-900 text-white">DOCX Word</option>
                        <option value="TXT" className="bg-slate-900 text-white">TXT Plain Text</option>
                        <option value="HTML" className="bg-slate-900 text-white">HTML Webpage</option>
                      </select>
                    </div>
                  </div>

                  {/* Premium TipTap Editor Component */}
                  <TipTapEditor content={editorContent} onChange={setEditorContent} />

                </div>
              )}

              {/* TAB 3: IMAGE EDITOR */}
              {activeTab === 'image' && (
                <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Stellar Image Crop & Filters</h2>
                    <p className="text-slate-400 text-xs mt-1">Resize, rotate, apply cosmic filters, and download updated images.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Left: Image Canvas box mock */}
                    <div className="md:col-span-2 bg-slate-950 rounded-2xl border border-white/10 p-4 flex items-center justify-center min-h-[300px] relative overflow-hidden">
                      <div className="absolute inset-0 cosmic-nebula opacity-40" />
                      <div 
                        className="relative z-10 border-2 border-teal-500/50 p-1 bg-slate-900 rounded-lg transition-all"
                        style={{ filter: imageFilter === 'grayscale' ? 'grayscale(1)' : imageFilter === 'sepia' ? 'sepia(1)' : imageFilter === 'blur' ? 'blur(4px)' : 'none' }}
                      >
                        <div className="w-56 h-40 bg-gradient-to-tr from-purple-800 to-indigo-900 rounded flex items-center justify-center text-xs text-teal-300 font-bold border border-white/10">
                          [ Image Edit Canvas ]
                        </div>
                      </div>
                    </div>

                    {/* Right: Controls parameters */}
                    <div className="space-y-4">
                      <div>
                        <span className="block text-xs font-bold text-slate-300 mb-2">Cosmic Filters</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button onClick={() => setImageFilter('none')} className={`py-1.5 rounded transition ${imageFilter === 'none' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-white/5 hover:bg-white/10'}`}>None</button>
                          <button onClick={() => setImageFilter('grayscale')} className={`py-1.5 rounded transition ${imageFilter === 'grayscale' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-white/5 hover:bg-white/10'}`}>Grayscale</button>
                          <button onClick={() => setImageFilter('sepia')} className={`py-1.5 rounded transition ${imageFilter === 'sepia' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-white/5 hover:bg-white/10'}`}>Sepia</button>
                          <button onClick={() => setImageFilter('blur')} className={`py-1.5 rounded transition ${imageFilter === 'blur' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-white/5 hover:bg-white/10'}`}>Blur</button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="block text-xs font-bold text-slate-300">Dimensions</span>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            value={imageWidth} 
                            onChange={(e) => setImageWidth(Number(e.target.value))}
                            placeholder="Width px" 
                            className="w-1/2 px-2.5 py-1.5 text-xs glass-input" 
                          />
                          <input 
                            type="number" 
                            value={imageHeight} 
                            onChange={(e) => setImageHeight(Number(e.target.value))}
                            placeholder="Height px" 
                            className="w-1/2 px-2.5 py-1.5 text-xs glass-input" 
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => alert(`Image exported to ${imageWidth}x${imageHeight} with filter: ${imageFilter.toUpperCase()}`)}
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded text-xs font-bold transition mt-4"
                      >
                        Apply & Save Image
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 4: OCR SCANNER */}
              {activeTab === 'ocr' && (
                <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">AI OCR & Invoice Structure Parser</h2>
                    <p className="text-slate-400 text-xs mt-1">Upload scanned items. Cosmos extracts details locally using Tesseract-OCR engines.</p>
                  </div>

                  <div className="flex gap-4 border-b border-white/10 pb-3">
                    <button onClick={() => setOcrType('general')} className={`px-4 py-2 rounded text-xs font-bold ${ocrType === 'general' ? 'bg-purple-600/30 text-teal-300' : 'text-slate-400'}`}>General Text</button>
                    <button onClick={() => setOcrType('invoice')} className={`px-4 py-2 rounded text-xs font-bold ${ocrType === 'invoice' ? 'bg-purple-600/30 text-teal-300' : 'text-slate-400'}`}>Invoice Parsing</button>
                    <button onClick={() => setOcrType('businesscard')} className={`px-4 py-2 rounded text-xs font-bold ${ocrType === 'businesscard' ? 'bg-purple-600/30 text-teal-300' : 'text-slate-400'}`}>Business Cards</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center space-y-4">
                      <UploadCloud className="w-10 h-10 text-purple-400 mx-auto" />
                      <span className="block text-xs text-slate-400">Select receipt, business card image or document picture to parse</span>
                      <label className="inline-block bg-teal-500 text-slate-950 font-bold px-4 py-2 rounded text-xs cursor-pointer">
                        Upload Image
                        <input type="file" accept="image/*" className="hidden" onChange={handleOcrUpload} />
                      </label>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-3">
                      <span className="block text-xs font-bold text-slate-300">Parser Output</span>
                      {ocrLoading ? (
                        <div className="text-center py-8 text-xs text-slate-400">Processing OCR filters...</div>
                      ) : (
                        <div className="space-y-4">
                          <textarea 
                            readOnly
                            value={ocrText}
                            placeholder="Extracted text will print here..."
                            className="w-full h-32 bg-transparent text-xs text-slate-300 border-none outline-none resize-none font-mono"
                          />
                          
                          {ocrResults && (
                            <div className="border-t border-white/10 pt-3 space-y-2 text-xs">
                              <span className="block font-bold text-teal-400">Parsed Structured Fields:</span>
                              {ocrType === 'invoice' && (
                                <div className="space-y-1">
                                  <div>Invoice Number: <strong>{ocrResults.invoice_number || 'N/A'}</strong></div>
                                  <div>Vendor: <strong>{ocrResults.vendor || 'N/A'}</strong></div>
                                  <div>Total Amount: <strong>${ocrResults.total_amount || '0.00'}</strong></div>
                                  <div>Invoice Date: <strong>{ocrResults.date || 'N/A'}</strong></div>
                                </div>
                              )}
                              {ocrType === 'businesscard' && (
                                <div className="space-y-1">
                                  <div>Full Name: <strong>{ocrResults.name || 'N/A'}</strong></div>
                                  <div>Email: <strong>{ocrResults.email || 'N/A'}</strong></div>
                                  <div>Contact Phone: <strong>{ocrResults.phone || 'N/A'}</strong></div>
                                  <div>Website: <strong>{ocrResults.website || 'N/A'}</strong></div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: BILLING & CHECKOUT */}
              {activeTab === 'billing' && (
                <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">SaaS Plans & Mock Checkout Billing</h2>
                    <p className="text-slate-400 text-xs mt-1">Trigger simulated payments via Stripe, Razorpay, or PayPal secure frameworks.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                      <span className="text-xs font-bold text-teal-400">Orbit Pro Plan</span>
                      <h3 className="text-2xl font-extrabold text-white">$9.99<span className="text-xs text-slate-400 font-normal">/mo</span></h3>
                      <button 
                        onClick={() => handleBillingCheckout('pro')}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition"
                      >
                        Mock Stripe Checkout
                      </button>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                      <span className="text-xs font-bold text-teal-400">Galaxy Team Plan</span>
                      <h3 className="text-2xl font-extrabold text-white">$29.99<span className="text-xs text-slate-400 font-normal">/mo</span></h3>
                      <button 
                        onClick={() => handleBillingCheckout('business')}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition"
                      >
                        Mock Razorpay Checkout
                      </button>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                      <span className="text-xs font-bold text-teal-400">Enterprise Universe</span>
                      <h3 className="text-2xl font-extrabold text-white">Custom</h3>
                      <button 
                        onClick={() => handleBillingCheckout('enterprise')}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition"
                      >
                        Mock PayPal Portal
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: ADMIN CONSOLE */}
              {activeTab === 'admin' && (
                <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Cosmos System Security & Revenue Console</h2>
                    <p className="text-slate-400 text-xs mt-1">System usage logs, PostgreSQL database metrics, and conversions queue statistics.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                      <span className="block text-[10px] text-slate-400 uppercase">Total Users</span>
                      <span className="block text-lg font-bold text-white mt-1">{adminStats.users}</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                      <span className="block text-[10px] text-slate-400 uppercase">Documents Registered</span>
                      <span className="block text-lg font-bold text-white mt-1">{adminStats.documents}</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                      <span className="block text-[10px] text-slate-400 uppercase">Completed Conversions</span>
                      <span className="block text-lg font-bold text-white mt-1">{adminStats.completed_conversions}</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                      <span className="block text-[10px] text-slate-400 uppercase">Failed Tasks</span>
                      <span className="block text-lg font-bold text-red-400 mt-1">{adminStats.failed_conversions}</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                      <span className="block text-[10px] text-slate-400 uppercase">Total Space Capacity</span>
                      <span className="block text-lg font-bold text-teal-300 mt-1">{(adminStats.storage_used_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                      <span className="block text-[10px] text-slate-400 uppercase">Celestial API Health</span>
                      <span className="block text-lg font-bold text-teal-400 mt-1">99.98%</span>
                    </div>
                  </div>

                  {/* System audit log list mockup */}
                  <div className="space-y-3">
                    <span className="block text-xs font-bold text-slate-300">Recent System Audit Logs (PostgreSQL events)</span>
                    <div className="p-3 bg-slate-950 rounded-xl space-y-2 text-[10px] font-mono text-slate-400 max-h-40 overflow-y-auto">
                      <div>[2026-06-18 17:41:00] [AUTH] User logged_in from IP 127.0.0.1 - OK</div>
                      <div>[2026-06-18 17:41:10] [CONVERT] Async Celery Task doc_pdf_to_docx scheduled - ID: 82ab91</div>
                      <div>[2026-06-18 17:41:12] [WORKER] Task 82ab91 completed inside container - Elapsed 1.2s</div>
                      <div>[2026-06-18 17:41:14] [BILLING] Subscription updated successfully for account user@domain.com</div>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* AI ASSISTANT CHAT BOT INTERFACE (Floating Widget inside portal) */}
          <div className="fixed bottom-6 right-6 z-40">
            <div className="w-80 glass-panel rounded-2xl border border-white/10 shadow-2xl flex flex-col h-96">
              
              {/* Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-teal-500 rounded-t-2xl flex items-center justify-between text-xs font-bold text-white">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cosmos AI Chat Assistant</span>
                </div>
              </div>

              {/* Chat message logs */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-2 rounded-lg leading-relaxed ${msg.sender === 'user' ? 'bg-purple-600/30 border border-purple-500/20 text-white' : 'bg-white/5 text-slate-300 border border-white/5'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiLoading && <div className="text-slate-500 text-[10px]">AI Assistant thinking...</div>}
              </div>

              {/* Message inputs */}
              <form onSubmit={handleSendMessage} className="p-2 border-t border-white/5 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ask AI translator or summarizer..." 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white outline-none focus:border-teal-500"
                />
                <button 
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                >
                  Send
                </button>
              </form>

            </div>
          </div>

        </main>
      )}

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8 text-center text-slate-500 text-[11px] mt-16 max-w-7xl mx-auto">
        <p>© 2026 Cosmos Convert. Engineered with FastAPI, Next.js 15, Celery, and Tauri for high performance operations.</p>
        <p className="mt-1 text-slate-600">Secure AES-256 JWT sessions & GDPR Compliant offline conversions.</p>
      </footer>

    </div>
  );
}
