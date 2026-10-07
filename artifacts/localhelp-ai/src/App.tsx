import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  Activity, ArrowRight, Banknote, Bike, BriefcaseBusiness, CarFront, Check,
  ChevronRight, CircleHelp, ClipboardList, Clock3, Construction, Droplets, Hammer,
  HardHat, Info, Lightbulb, MapPin, MessageCircle, Mic, Phone, PlugZap, Search, Send,
  ShieldCheck, Sparkles, Star, Truck, UserRound, Wallet, Wrench, X, Wind, Zap,
  ImagePlus, Fuel, PackageCheck, Battery, Eye, EyeOff,
} from 'lucide-react';

type Answer = 'yes' | 'no' | 'unknown';
type RequestStatus = 'Requested' | 'Accepted' | 'On the way' | 'Arrived' | 'Service started' | 'Completed' | 'Cancelled';
type ServiceRequest = {
  id: string; service: string; problem?: string; details?: string; provider: string; status: RequestStatus; price: string;
  created: string; shared: boolean; address: string; eta: number; distance: number;
  rating?: number; review?: string;
};
type Analysis = { issue: string; confidence: 'High' | 'Moderate' | 'Low'; alternatives: string[]; questions: string[]; checklist: string[]; safety: string | null; };
const STORAGE_KEY = 'localhelp-prototype-v1';
const categories = [
  { name: 'Fuel Delivery', icon: Fuel, hint: 'Fuel delivery' },
  { name: 'Puncture Repair', icon: Bike, hint: 'Tyre help' },
  { name: 'Bike Mechanic', icon: Bike, hint: 'Two-wheeler repair' },
  { name: 'Car Mechanic', icon: CarFront, hint: 'Car repair' },
  { name: 'Battery / Jump Start', icon: Battery, hint: 'Battery issue' },
  { name: 'Plumber', icon: Droplets, hint: 'Water issue' },
  { name: 'Electrician', icon: Zap, hint: 'Power issue' },
  { name: 'AC Repair', icon: Wind, hint: 'Cooling issue' },
  { name: 'Towing', icon: Truck, hint: 'Vehicle recovery' },
  { name: 'Painter', icon: Construction, hint: 'Wall finish' },
  { name: 'Carpenter', icon: Hammer, hint: 'Woodwork' },
  { name: 'Mason / Construction', icon: HardHat, hint: 'Construction' },
  { name: 'Welder', icon: Wrench, hint: 'Metalwork' },
  { name: 'Labour', icon: BriefcaseBusiness, hint: 'On-site support' },
  { name: 'Movers', icon: PackageCheck, hint: 'Moving help' },
  { name: 'Appliance Repair', icon: PlugZap, hint: 'Home appliance' },
  { name: 'Other Services', icon: CircleHelp, hint: 'Describe an issue' },
];
const navCustomer = [
  { href: '/', label: 'Get help', icon: Sparkles },
  { href: '/services', label: 'Services', icon: Wrench },
  { href: '/requests', label: 'Requests', icon: ClipboardList },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: UserRound },
];
const navProvider = [
  { href: '/provider', label: 'Dashboard', icon: Activity },
  { href: '/provider/requests', label: 'Requests', icon: ClipboardList },
  { href: '/provider/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { href: '/provider/earnings', label: 'Earnings', icon: Wallet },
  { href: '/provider/profile', label: 'Profile', icon: UserRound },
];
const demoProviders = [
  { id: 'p1', name: 'Ravi Kumar', initials: 'RK', rating: '4.8', reviews: 126, distance: 1.2, eta: 18, services: ['Fuel Delivery', 'Puncture Repair', 'Bike Mechanic', 'Car Mechanic', 'Battery / Jump Start', 'Towing'], range: '₹250–₹650', available: true, why: 'Close by, with strong ratings for roadside calls.' },
  { id: 'p2', name: 'Sana Services', initials: 'SS', rating: '4.9', reviews: 84, distance: 2.4, eta: 24, services: ['Plumber', 'Electrician', 'AC Repair', 'Appliance Repair'], range: '₹350–₹900', available: true, why: 'Experienced with diagnosis and common home repairs.' },
  { id: 'p3', name: 'Mohan Works', initials: 'MW', rating: '4.7', reviews: 61, distance: 3.1, eta: 31, services: ['Painter', 'Carpenter', 'Mason / Construction', 'Welder', 'Labour', 'Movers', 'Other Services'], range: '₹400–₹1,200', available: false, why: 'Broad on-site skills and dependable customer feedback.' },
  { id: 'p4', name: 'City Roadside Assist', initials: 'CA', rating: '4.6', reviews: 93, distance: 4.6, eta: 36, services: ['Fuel Delivery', 'Puncture Repair', 'Bike Mechanic', 'Car Mechanic', 'Battery / Jump Start', 'Towing'], range: '₹300–₹800', available: true, why: 'A second nearby option for roadside support.' },
];
const stageOrder: RequestStatus[] = ['Requested', 'Accepted', 'On the way', 'Arrived', 'Service started', 'Completed'];
const problemExamples = ['My bike won’t start.', 'My tap is leaking.', 'One room has no electricity.', 'My car battery seems dead.', 'My AC is not cooling.', 'My tyre is flat.', 'I need someone to paint my house.'];
const safetyPattern = /\b(fire|flame|smoke|sparks?|electric(?:al)? shock|gas leak|gas smell|smell of gas|fuel leak|fuel smell|smell of (?:petrol|diesel|fuel)|petrol smell|diesel smell|injur(?:y|ed)|accident|crash|bleeding|dangerous|live wire|stranded on (?:a )?(?:highway|motorway|road)|stuck in traffic)\b/i;

function readSaved() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value) return JSON.parse(value) as { requests: ServiceRequest[]; analyses: { id: string; text: string; issue: string; at: string }[]; profile: { name: string; phone: string; area: string }; };
  } catch { /* Start clean when browser storage is unavailable. */ }
  return { requests: [] as ServiceRequest[], analyses: [] as { id: string; text: string; issue: string; at: string }[], profile: { name: 'Aarav Mehta', phone: '', area: 'Indiranagar, Bengaluru' } };
}
function matchIssue(text: string): Analysis {
  const t = text.toLowerCase();
  let issue = 'Other Services';
  let confidence: Analysis['confidence'] = 'Low';
  const isBike = /\b(bike|scooter|motorcycle|two[- ]wheeler)\b/.test(t);
  const isCar = /\b(car|automobile)\b/.test(t);
  const isStartingProblem = /\b(won['’]?t|will not)\s+(?:start|turn over)\b|\bnot starting\b|\bstopped suddenly\b/.test(t);
  if (/\b(petrol|diesel|fuel|out of gas|empty tank|no petrol)\b/.test(t)) {
    issue = 'Fuel Delivery'; confidence = 'High';
  } else if (/\b(puncture|flat tyre|flat tire|tyre|tire)\b/.test(t)) {
    issue = 'Puncture Repair'; confidence = 'High';
  } else if (/\b(battery|dead battery|jump start)\b/.test(t)) {
    issue = 'Battery / Jump Start'; confidence = 'Moderate';
  } else if (/\b(bike mechanic|scooter mechanic|motorcycle mechanic)\b/.test(t) || (isStartingProblem && isBike)) {
    issue = 'Bike Mechanic'; confidence = 'Moderate';
  } else if (/\bcar mechanic\b/.test(t) || (isStartingProblem && isCar)) {
    issue = 'Car Mechanic'; confidence = 'Moderate';
  } else if (/\b(water leak|leak|pipe|plumb|tap|faucet|drain)\b/.test(t)) {
    issue = 'Plumber'; confidence = 'High';
  } else if (/\b(electric(?:ian|al)?|wiring|power trip|short circuit|switch|socket|shock|no power)\b/.test(t)) {
    issue = 'Electrician'; confidence = 'Moderate';
  } else if (/\b(ac|air conditioner|cooling)\b/.test(t)) {
    issue = 'AC Repair'; confidence = 'Moderate';
  } else if (/\b(refrigerator|fridge|washing machine|microwave|appliance|geyser)\b/.test(t)) {
    issue = 'Appliance Repair'; confidence = 'Moderate';
  } else if (/\b(tow|towing|vehicle recovery|stuck vehicle)\b/.test(t)) {
    issue = 'Towing'; confidence = 'Moderate';
  } else if (/\b(paint|wall colour|wall color)\b/.test(t)) {
    issue = 'Painter'; confidence = 'High';
  } else if (/\b(carpent|wood|door|cabinet|furniture)\b/.test(t)) {
    issue = 'Carpenter'; confidence = 'Moderate';
  } else if (/\b(mason|brick|cement|construction|tile)\b/.test(t)) {
    issue = 'Mason / Construction'; confidence = 'Moderate';
  } else if (/\b(weld|metal gate)\b/.test(t)) {
    issue = 'Welder'; confidence = 'Moderate';
  } else if (/\b(labour|labor|helper|loading|unloading)\b/.test(t)) {
    issue = 'Labour'; confidence = 'Moderate';
  } else if (/\b(mover|shift house|relocation|packers)\b/.test(t)) {
    issue = 'Movers'; confidence = 'Moderate';
  } else if (isStartingProblem && (isBike || isCar || /\b(vehicle|engine)\b/.test(t))) {
    issue = 'Other Services'; confidence = 'Low';
  }
  const unsafe = safetyPattern.test(text);
  const vehicle = ['Bike Mechanic', 'Car Mechanic', 'Battery / Jump Start', 'Fuel Delivery', 'Puncture Repair', 'Towing'].includes(issue) || (issue === 'Other Services' && (isStartingProblem || /\b(vehicle|engine)\b/.test(t)));
  const unknown = confidence === 'Low';
  const alternatives = issue === 'Bike Mechanic' ? ['Battery / Jump Start', 'Fuel Delivery']
    : issue === 'Car Mechanic' ? ['Battery / Jump Start', 'Towing']
      : issue === 'Puncture Repair' ? [isBike ? 'Bike Mechanic' : isCar ? 'Car Mechanic' : 'Towing']
        : issue === 'Plumber' ? ['Electrician'] : issue === 'AC Repair' ? ['Appliance Repair', 'Electrician']
          : issue === 'Other Services' ? ['Bike Mechanic', 'Car Mechanic', 'Other Services'] : [];
  const questions = issue === 'Other Services' && isStartingProblem
    ? ['Is the vehicle a car or a two-wheeler?', 'What happens when you try to start it?']
    : unknown ? ['What is affected: a home fixture, appliance, or vehicle?', 'What happened when the problem began?']
      : vehicle ? ['Are you safely away from moving traffic?', 'What happens when you try to start it?'] : [];
  const checklist = issue === 'Plumber' ? ['Is water actively leaking right now?', 'Can you safely identify the local water shutoff?', 'Is water near any electrical equipment?']
    : issue === 'Electrician' ? ['Is there smoke, a burning smell, or visible sparking?', 'Is the issue limited to one room or outlet?', 'Are nearby lights working?']
      : ['Bike Mechanic', 'Car Mechanic', 'Other Services'].includes(issue) && vehicle
        ? ['Is the vehicle safely away from traffic?', 'Do the dashboard lights turn on?', 'Is there enough fuel?', 'Does the engine make a sound when starting?', 'Is there smoke, a strong fuel smell, or visible damage?']
        : issue === 'Puncture Repair' ? ['Which tyre is affected?', 'Does the tyre look visibly deflated?', 'Is the vehicle in a safe location?']
          : issue === 'AC Repair' ? ['Is cooling completely absent or just weak?', 'Is air coming from the indoor unit?', 'Are there unusual sounds or smells?', 'Is there water leakage or an error code?']
            : issue === 'Fuel Delivery' ? ['Is the vehicle safely stopped?', 'Is the correct fuel type confirmed?', 'Do you know approximately how much fuel is needed?']
              : ['Is the affected area safe to approach?', 'Can you describe when the issue began?', 'Is there any visible damage or active hazard?'];
  return { issue, confidence, alternatives, questions, checklist, safety: unsafe ? 'Move away from the hazard if you can do so safely. For fire, smoke, sparks, strong fuel or gas smell, a dangerous roadside position, serious injury or an accident, contact local emergency services now. Do not touch, inspect or attempt repairs.' : null };
}

function AppShell() {
  const [location, setLocation] = useLocation();
  const [mode, setMode] = useState<'customer' | 'provider'>(() => localStorage.getItem('localhelp-mode') === 'provider' ? 'provider' : 'customer');
  const [saved, setSaved] = useState(readSaved);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<{ kind: string; requestId?: string; providerId?: string } | null>(null);
  const [issueText, setIssueText] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [sortBy, setSortBy] = useState('recommended');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [filterService, setFilterService] = useState('All services');
  const [followupAnswers, setFollowupAnswers] = useState<Record<number, string>>({});
  const [draftMessage, setDraftMessage] = useState('');
  const [messages, setMessages] = useState(['Hi Aarav, how can we help you today?']);
  const [profile, setProfile] = useState(saved.profile);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [manualAddress, setManualAddress] = useState({ address: '', area: '', pin: '', landmark: '' });
  const [manualAddressConsent, setManualAddressConsent] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, profile })); }, [saved, profile]);
  useEffect(() => { localStorage.setItem('localhelp-mode', mode); }, [mode]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(''), 3000); return () => window.clearTimeout(t); }, [toast]);
  useEffect(() => {
    const timer = window.setInterval(() => setExampleIndex((index) => (index + 1) % problemExamples.length), 2800);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (mode === 'provider' && !location.startsWith('/provider')) setLocation('/provider');
    if (mode === 'customer' && location.startsWith('/provider')) setLocation('/');
  }, [mode, location, setLocation]);

  const goMode = (next: 'customer' | 'provider') => { setMode(next); setLocation(next === 'provider' ? '/provider' : '/'); };
  const updateRequests = (fn: (rows: ServiceRequest[]) => ServiceRequest[]) => setSaved((old) => ({ ...old, requests: fn(old.requests) }));
  const runAnalysis = (text = issueText) => {
    if (!text.trim()) { setToast('Tell us a little about what is happening first.'); return; }
    const result = matchIssue(text);
    setIssueText(text); setAnalysis(result); setAnswers({}); setFollowupAnswers({});
    setSaved((old) => ({ ...old, analyses: [{ id: String(Date.now()), text, issue: result.issue, at: new Date().toISOString() }, ...old.analyses].slice(0, 30) }));
    window.setTimeout(() => document.getElementById('analysis-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const startRequest = (providerId: string) => { setModal({ kind: 'review', providerId }); };
  const openManualAddress = (requestId: string) => {
    setManualAddress({ address: '', area: '', pin: '', landmark: '' });
    setManualAddressConsent(false);
    setModal({ kind: 'manual-address', requestId });
  };
  const selectedProvider = demoProviders.find((p) => p.id === modal?.providerId);
  const answeredCount = Object.values(answers).filter((answer) => Boolean(answer)).length;
  const confirmedHazard = Boolean(analysis?.checklist.some((item, index) => {
    if (/safely away|safe location|safely stopped|safe to approach/i.test(item)) return answers[index] === 'no';
    if (/smoke|burning smell|sparking|strong fuel|gas smell|active hazard|water near any electrical/i.test(item)) return answers[index] === 'yes';
    return false;
  }) || analysis?.questions.some((question, index) =>
    followupAnswers[index] === 'No' && /safely away|safe location/i.test(question),
  ));
  const safetyActive = Boolean(analysis?.safety || confirmedHazard);
  const providedDetails = useMemo(() => {
    if (!analysis) return [];
    return [
      ...analysis.questions.map((question, index) => followupAnswers[index] ? `${question}: ${followupAnswers[index]}` : ''),
      ...analysis.checklist.map((item, index) => answers[index] ? `${item}: ${answers[index] === 'unknown' ? 'Customer is unsure' : answers[index] === 'yes' ? 'Customer confirmed' : 'Customer said no'}` : ''),
    ].filter(Boolean);
  }, [analysis, answers, followupAnswers]);
  const recommendation = useMemo(() => {
    if (!analysis) return null;
    let service = analysis.issue;
    if (service === 'Other Services' && analysis.questions[0]?.includes('vehicle a car')) {
      if (followupAnswers[0] === 'Car') service = 'Car Mechanic';
      if (followupAnswers[0] === 'Two-wheeler') service = 'Bike Mechanic';
    }
    const soundQuestion = analysis.questions.findIndex((question) => question.includes('What happens when you try to start it?'));
    if (soundQuestion >= 0 && ['Nothing', 'Clicking'].includes(followupAnswers[soundQuestion])) {
      service = 'Battery / Jump Start';
    }
    const fuelCheck = analysis.checklist.findIndex((item) => /enough fuel/i.test(item));
    if (fuelCheck >= 0 && answers[fuelCheck] === 'no') service = 'Fuel Delivery';
    const dashboardCheck = analysis.checklist.findIndex((item) => /dashboard lights turn on/i.test(item));
    if (dashboardCheck >= 0 && answers[dashboardCheck] === 'no' && service !== 'Fuel Delivery') service = 'Battery / Jump Start';
    return { service, alternatives: service === analysis.issue ? analysis.alternatives : [analysis.issue] };
  }, [analysis, answers, followupAnswers]);
  const createRequest = () => {
    if (!selectedProvider || !analysis) return;
    const req: ServiceRequest = { id: `LH-${Math.floor(1000 + Math.random() * 8999)}`, service: recommendation?.service ?? analysis.issue, problem: issueText, details: providedDetails.join(' · ') || undefined, provider: selectedProvider.name, status: 'Requested', price: selectedProvider.range, created: new Date().toISOString(), shared: false, address: 'Not shared', eta: selectedProvider.eta, distance: selectedProvider.distance };
    updateRequests((rows) => [req, ...rows]); setLocation('/requests'); setToast('Demo request saved. No provider was contacted.');
    setModal({ kind: 'location-consent', requestId: req.id });
  };
  const enableLocationSharing = (requestId: string, address: string) => {
    updateRequests((rows) => rows.map((r) => r.id === requestId && !['Completed', 'Cancelled'].includes(r.status) ? { ...r, shared: true, address } : r));
    setModal(null);
    setToast('Location sharing is on for this demo request only. You can stop it at any time.');
  };
  const stopLocationSharing = (requestId: string) => {
    updateRequests((rows) => rows.map((r) => r.id === requestId ? { ...r, shared: false, address: 'Location sharing stopped' } : r));
    setModal(null);
    setToast('Location sharing stopped immediately for this request.');
  };
  const updateStatus = (id: string, status: RequestStatus) => {
    updateRequests((rows) => rows.map((r) => {
      if (r.id !== id) return r;
      const sharingEnded = status === 'Completed' || status === 'Cancelled';
      return { ...r, status, shared: sharingEnded ? false : r.shared, address: sharingEnded && r.shared ? 'Location sharing ended' : r.address, eta: Math.max(4, r.eta - 6), distance: Math.max(0, +(r.distance - .8).toFixed(1)) };
    }));
    setToast(status === 'Completed' ? 'Demo job completed. Location sharing has ended.' : status === 'Cancelled' ? 'Request cancelled. Location sharing has ended.' : `Demo status updated: ${status}.`);
  };
  const providers = useMemo(() => {
    const matching = demoProviders.filter((p) => (!recommendation || p.services.includes(recommendation.service)) && (filterService === 'All services' || p.services.includes(filterService)) && (!availableOnly || p.available));
    return [...matching].sort((a, b) => sortBy === 'nearest' ? a.distance - b.distance : sortBy === 'rating' ? Number(b.rating) - Number(a.rating) : Number(b.rating) * 2 - a.distance);
  }, [recommendation, filterService, availableOnly, sortBy]);
  const activeNav = mode === 'provider' ? navProvider : navCustomer;
  const NavItems = ({ mobile = false }: { mobile?: boolean }) => <>{activeNav.map(({ href, label, icon: Icon }) => (
    <Link key={href} href={href} className={`${mobile ? '' : 'nav-link'} ${location === href ? 'selected' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <Icon size={17} /><span>{label}</span>
    </Link>
  ))}</>;

  const Home = () => <div>
    <section className="assistant-hero">
      <div className="hero-kicker"><Sparkles size={14} /> LocalHelp AI <span style={{ opacity: .55 }}>·</span> First response, made clearer</div>
      <h1>What’s wrong? Let AI help you figure it out.</h1>
      <p>Describe your problem and we’ll guide you through a quick optional checklist before connecting you with the right local professional.</p>
      <div className="hero-orb" aria-hidden="true"><Lightbulb size={39} /></div>
      <div className="hero-helper"><ShieldCheck size={14} /> Practical guidance. Your choice at every step.</div>
    </section>
    <section className="card composer" aria-label="Describe your issue">
      <textarea data-testid="input-problem-description" value={issueText} onChange={(e) => setIssueText(e.target.value)} placeholder={problemExamples[exampleIndex]} />
      <div className="composer-actions">
        <div className="action-cluster">
          <button className="icon-btn" data-testid="button-simulate-voice" onClick={() => { setIssueText('My bike has a flat tyre and I am safely parked.'); setToast('Voice input is simulated in this demo. Review the sample before continuing.'); }}><Mic size={15} /> Tell AI</button>
          <button className="icon-btn" data-testid="button-simulate-image" onClick={() => { setIssueText('There is a leak under my kitchen sink.'); setToast('Image scan is simulated in this demo. No image was uploaded.'); }}><ImagePlus size={15} /> Scan Problem</button>
        </div>
        <button className="btn" data-testid="button-analyze-problem" onClick={() => runAnalysis()}><Sparkles size={15} /> Analyze Problem <ArrowRight size={15} /></button>
      </div>
    </section>
    <div className="quick-grid" aria-label="Quick problems">{[
      ['Bike won’t start', 'My bike won’t start.'],
      ['Car won’t start', 'My car won’t start.'],
      ['Flat tyre', 'I have a flat tyre.'],
      ['No fuel', 'My bike has run out of petrol.'],
      ['Water leak', 'There is a water leak under my sink.'],
      ['Electrical problem', 'There is no power in one room.'],
      ['AC not cooling', 'My AC is running but not cooling.'],
    ].map(([text, val]) => <button key={text} className="quick-chip" data-testid={`button-quick-${text.toLowerCase().replaceAll(' ', '-')}`} onClick={() => { setIssueText(val); runAnalysis(val); }}>{text}</button>)}</div>
    <div className="section-row"><h2>What kind of help?</h2><Link href="/services" className="btn ghost small-btn" data-testid="link-all-services">All services <ChevronRight size={15} /></Link></div>
    <div className="service-grid">{categories.slice(0, 8).map(({ name, icon: Icon, hint }) => <button className="service-tile" key={name} data-testid={`button-service-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`} onClick={() => { setIssueText(`I need help with ${name.toLowerCase()}.`); runAnalysis(`I need help with ${name.toLowerCase()}.`); }}><span className="service-icon"><Icon size={18} /></span><strong>{name}</strong><span>{hint}</span></button>)}</div>
    {analysis && <section className="card results-panel" id="analysis-results" data-testid="panel-analysis-results">
       <div className="page-heading" style={{ marginBottom: 10 }}><div><div className="eyebrow">Your first response</div><h2 style={{ marginTop: 6 }}>{analysis.safety ? 'Let’s focus on immediate safety' : 'What I understand'}</h2></div><span className="confidence"><Activity size={13} /> {analysis.confidence} confidence</span></div>
       {!analysis.safety && <div className="summary-box" data-testid="text-problem-summary"><strong>Your description</strong><p>{issueText}</p><div className="small muted">Likely service: <strong>{recommendation?.service}</strong>{recommendation && recommendation.service !== analysis.issue ? ' · updated from the information you provided' : ''}</div>{providedDetails.length > 0 && <div className="summary-details"><strong>Details you chose to share</strong><ul>{providedDetails.map((detail) => <li key={detail}>{detail}</li>)}</ul></div>}</div>}
      {analysis.safety && <div className="alert-box" role="alert" data-testid="alert-safety"><strong>Safety comes first.</strong><br />{analysis.safety}</div>}
       {analysis.safety && <p className="muted small">Skip troubleshooting and provider selection for now. Revisit this page when you are safe.</p>}
       {!analysis.safety && confirmedHazard && <div className="alert-box" role="alert" data-testid="alert-confirmed-hazard"><strong>Stop optional checks and prioritise safety.</strong><br />Your answer suggests a possible hazard. Move away if safe to do so; do not touch or attempt repairs. Contact local emergency services if anyone is in immediate danger.</div>}
      {!analysis.safety && <p className="muted small">This is an initial guess from your description, not a diagnosis. A provider may need to assess the situation in person.</p>}
        {!analysis.safety && analysis.questions.length > 0 && <div className="standard-card" style={{ padding: 15, background: '#f7f8f3', marginTop: 12 }}><strong style={{ fontSize: 12 }}>A couple of questions can help</strong>{analysis.questions.map((question, i) => {
         const options = question.includes('vehicle a car') ? ['Car', 'Two-wheeler', 'Not sure']
           : question.includes('What happens when you try to start it') ? ['Nothing', 'Clicking', 'Cranking', 'Not sure']
             : question.includes('What is affected') ? ['Home fixture', 'Appliance', 'Vehicle', 'Other', 'Not sure']
               : question.includes('What happened') ? ['Stopped suddenly', 'Gradually got worse', 'Not sure'] : ['Yes', 'No', 'I don’t know'];
         return <label className="field-wrap" key={question} style={{ marginTop: 10 }}>{question}<select className="field" data-testid={`select-followup-${i}`} value={followupAnswers[i] ?? ''} onChange={(e) => setFollowupAnswers((old) => ({ ...old, [i]: e.target.value }))}><option value="">Choose if you know</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
       })}</div>}
       {!safetyActive && recommendation && recommendation.alternatives.length > 0 && <><div className="small muted" style={{ marginTop: 16 }}>Other possibilities</div><div className="alt-row">{recommendation.alternatives.map((alt) => <button key={alt} className="alt-button" data-testid={`button-alternative-${alt.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`} onClick={() => runAnalysis(`${alt} issue`)}>{alt}</button>)}</div></>}
        {!analysis.safety && <div className="checklist"><div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><ShieldCheck size={16} color="#26715e" /><strong style={{ fontSize: 13 }}>Before You Call · optional safe checks</strong></div><p className="muted small" style={{ margin: '5px 0 8px' }}>Answer only what you know. You can leave anything unanswered or choose “I don’t know”.</p>
        {analysis.checklist.map((item, i) => <div className="check-row" key={item}><div className="check-copy">{item}</div><div className="check-actions">{(['yes', 'no', 'unknown'] as Answer[]).map((answer) => <button key={answer} className={answers[i] === answer ? 'on' : ''} data-testid={`button-check-${i}-${answer}`} aria-pressed={answers[i] === answer} onClick={() => setAnswers((old) => { const next = { ...old }; if (old[i] === answer) delete next[i]; else next[i] = answer; return next; })}>{answer === 'yes' ? 'Yes' : answer === 'no' ? 'No' : 'I don’t know'}</button>)}</div></div>)}
        {answeredCount > 0 && <div className="small muted" data-testid="text-checklist-reassessment" style={{ marginTop: 10 }}>{confirmedHazard ? 'Your confirmed answer changes our guidance: stop checking and keep clear of the hazard.' : `We used only ${answeredCount} answer${answeredCount === 1 ? '' : 's'} you provided. Unanswered checks remain unknown.`}</div>}
          <div className="recommend-row"><span className="muted small">{answeredCount} of {analysis.checklist.length} answered · optional</span><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn ghost small-btn" data-testid="button-skip-checklist" onClick={() => { setAnswers({}); if (!safetyActive) document.getElementById('nearby-providers')?.scrollIntoView({ behavior: 'smooth' }); }}>Skip checklist</button><button className="btn" data-testid="button-find-help" onClick={() => { if (!safetyActive) document.getElementById('nearby-providers')?.scrollIntoView({ behavior: 'smooth' }); }}>Get AI recommendation <ArrowRight size={15} /></button></div></div>
       </div>}
      <div className="disclosure"><Info size={15} /> This prototype uses local intent matching only. It does not diagnose, book a real provider, or send your description anywhere.</div>
    </section>}
    {analysis && safetyActive && <div className="safety-banner" data-testid="text-provider-results-paused"><strong>Provider matching is paused while safety is the priority.</strong><br />When you are safe, you can return and request the appropriate help.</div>}
    {analysis && !safetyActive && <section id="nearby-providers" style={{ marginTop: 28 }}><div className="page-heading"><div><div className="eyebrow">Sample options · demo data</div><h2>Nearby {recommendation?.service.toLowerCase()} providers</h2></div></div>
      <div className="small muted" style={{ marginBottom: 10 }}>Recommended service: <strong>{recommendation?.service}</strong>. This is a best-fit category based only on your description and selected answers.</div>
      <FilterControls filterService={filterService} setFilterService={setFilterService} sortBy={sortBy} setSortBy={setSortBy} availableOnly={availableOnly} setAvailableOnly={setAvailableOnly} />
      {providers.length ? <ProviderCards rows={providers} onSelect={startRequest} onContact={() => { setToast('Provider contact is a demo affordance. No call or message was placed.'); }} onProfile={(id) => setModal({ kind: 'provider-profile', providerId: id })} /> : <div className="card empty-state">No sample providers match those filters. Try a different filter.</div>}
      <p className="footer-note">Provider names, ratings, availability and price ranges are illustrative demo data. Estimates are not guaranteed.</p>
    </section>}
    {!analysis && <div className="disclosure"><ShieldCheck size={15} /> Your notes stay in this browser. You decide whether to request service or share a location.</div>}
  </div>;

  const Services = () => <><PageHeading eyebrow="Find the right kind of help" title="Services" subtitle="Choose a starting point. You can change your mind after describing the issue." />
    <div className="service-grid">{categories.map(({ name, icon: Icon, hint }) => <button className="service-tile" key={name} data-testid={`button-service-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`} onClick={() => { setIssueText(`I need help with ${name.toLowerCase()}.`); runAnalysis(`I need help with ${name.toLowerCase()}.`); setLocation('/'); }}><span className="service-icon"><Icon size={18} /></span><strong>{name}</strong><span>{hint}</span></button>)}</div>
    <div className="disclosure"><Info size={15} /> Listings are sample categories for this prototype. No real service marketplace is connected.</div>
  </>;

  const Requests = () => <><PageHeading eyebrow="Your service activity" title="Requests" subtitle="Follow demo request progress and manage sharing. Nothing here contacts a real provider." />
    {saved.requests.length === 0 ? <div className="card empty-state"><div className="empty-symbol"><ClipboardList size={22} /></div><h3>No requests yet</h3><p className="small">When you choose a sample provider, your demo request will appear here.</p><Link href="/" className="btn" data-testid="link-start-request">Describe an issue <ArrowRight size={15} /></Link></div> :
      <div className="stack">{saved.requests.map((r) => <RequestCard key={r.id} request={r} onStatus={updateStatus} onShare={() => setModal({ kind: 'sharing', requestId: r.id })} onReview={() => { setReviewRating(5); setReviewText(''); setModal({ kind: 'review-rating', requestId: r.id }); }} />)}</div>}
    <div className="section-row"><h2>Recent issue notes</h2><span className="small muted">Saved on this device</span></div>
     {saved.analyses.length ? <div className="card standard-card">{saved.analyses.slice(0, 8).map((a) => <div className="table-row" key={a.id}><div style={{ flex: 1 }}><strong>{a.issue}</strong><div className="small muted">{a.text}</div><div style={{ display: 'flex', gap: 7, marginTop: 7 }}><button className="btn ghost small-btn" data-testid={`button-view-analysis-${a.id}`} onClick={() => { setLocation('/'); runAnalysis(a.text); }}>View analysis</button><button className="btn secondary small-btn" data-testid={`button-find-service-again-${a.id}`} onClick={() => { setLocation('/'); runAnalysis(a.text); window.setTimeout(() => document.getElementById('nearby-providers')?.scrollIntoView({ behavior: 'smooth' }), 120); }}>Find service again</button></div></div><span className="small muted">{new Date(a.at).toLocaleDateString()}</span></div>)}</div> : <div className="card empty-state small">Your issue summaries will show here after an analysis.</div>}
  </>;

  const Messages = () => <><PageHeading eyebrow="A simple demo inbox" title="Messages" subtitle="Message composition is local-only. No message leaves this device." />
    <div className="card standard-card"><div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 16, borderBottom: '1px solid #edf0eb' }}><span className="provider-avatar"><MessageCircle size={18} /></span><div><strong style={{ fontSize: 13 }}>LocalHelp support</strong><div className="small muted">Prototype conversation</div></div><span className="demo-tag">DEMO</span></div>
      <div className="message-thread" style={{ paddingTop: 18 }}>{messages.map((m, i) => <div key={`${i}-${m}`} className={`message-box ${i > 0 ? 'mine' : ''}`} data-testid={`message-item-${i}`}>{m}</div>)}</div>
      <form className="message-compose" onSubmit={(e) => { e.preventDefault(); if (!draftMessage.trim()) return; setMessages((m) => [...m, draftMessage.trim()]); setDraftMessage(''); }}><input className="field" value={draftMessage} onChange={(e) => setDraftMessage(e.target.value)} placeholder="Write a demo message…" data-testid="input-message" /><button className="btn" data-testid="button-send-message" type="submit"><Send size={15} /> Send</button></form>
    </div>
  </>;

  const Profile = () => <><PageHeading eyebrow="Your details" title="Profile" subtitle="Saved only in this browser for the demo." />
    <form className="card standard-card stack" onSubmit={(e) => { e.preventDefault(); setSaved((s) => ({ ...s, profile })); setToast('Profile details saved on this device.'); }}>
      <div className="provider-top"><div className="provider-avatar"><UserRound size={20} /></div><div><strong>{profile.name || 'Your profile'}</strong><div className="small muted">Customer profile · local demo</div></div></div>
      <label className="field-wrap">Name<input data-testid="input-profile-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
      <label className="field-wrap">Phone (optional)<input data-testid="input-profile-phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+91" /></label>
      <label className="field-wrap">Usual area<input data-testid="input-profile-area" value={profile.area} onChange={(e) => setProfile({ ...profile, area: e.target.value })} /></label>
      <div><button className="btn" data-testid="button-save-profile" type="submit">Save profile</button></div>
      <div className="disclosure"><ShieldCheck size={15} /> No account or backend. Clearing local browser data removes your demo history.</div>
    </form></>;

  const ProviderHome = () => {
    const active = saved.requests.filter((r) => !['Completed', 'Cancelled'].includes(r.status));
    return <><PageHeading eyebrow="Provider demo workspace" title="Good morning, service partner" subtitle="Preview a provider view with sample requests. Location details stay hidden unless the customer approves sharing." />
      <div className="stats-grid"><Stat label="Open requests" value={String(active.length)} icon={ClipboardList} /><Stat label="Demo jobs today" value="3" icon={BriefcaseBusiness} /><Stat label="Demo earnings" value="₹2,480" icon={Banknote} /></div>
      <div className="section-row"><h2>New customer requests</h2><Link href="/provider/requests" className="btn ghost small-btn" data-testid="link-provider-all-requests">View all <ArrowRight size={14} /></Link></div>
      <div className="card standard-card"><div className="disclosure" style={{ marginTop: 0 }}><EyeOff size={15} /> A customer’s address is never shown in provider mode until they approve service-specific sharing.</div>
        {active.length ? active.slice(0, 3).map((r) => <ProviderRequestRow key={r.id} request={r} onStatus={updateStatus} />) : <div className="empty-state"><div className="empty-symbol"><BriefcaseBusiness size={20} /></div><h3>Waiting for a demo request</h3><p className="small">Switch to customer mode to create one.</p></div>}
      </div><div className="footer-note">All requests, earnings and job activity shown here are simulated.</div>
    </>;
  };
  const ProviderRequests = () => <><PageHeading eyebrow="Provider workspace" title="Requests" subtitle="Progress sample customer requests step by step." />{saved.requests.length ? <div className="stack">{saved.requests.map((r) => <ProviderRequestRow key={r.id} request={r} onStatus={updateStatus} />)}</div> : <div className="card empty-state"><h3>No incoming requests</h3><p className="small">Create one in customer mode to demonstrate the workflow.</p></div>}</>;
  const ProviderJobs = () => <><PageHeading eyebrow="Provider workspace" title="Jobs" subtitle="Completed and in-progress demo work." /><div className="card standard-card">{saved.requests.filter((r) => ['Service started', 'Completed'].includes(r.status)).length ? saved.requests.filter((r) => ['Service started', 'Completed'].includes(r.status)).map((r) => <ProviderRequestRow key={r.id} request={r} onStatus={updateStatus} />) : <div className="empty-state"><div className="empty-symbol"><BriefcaseBusiness size={20} /></div><h3>No jobs in progress</h3><p className="small">Accepted demo requests will appear here.</p></div>}</div></>;
  const ProviderEarnings = () => <><PageHeading eyebrow="Provider workspace" title="Earnings" subtitle="Illustrative figures only; no payments are processed." /><div className="stats-grid"><Stat label="This week · demo" value="₹8,640" icon={Banknote} /><Stat label="Completed jobs" value={String(saved.requests.filter((r) => r.status === 'Completed').length + 12)} icon={Check} /><Stat label="Average job value" value="₹720" icon={Wallet} /></div><div className="card standard-card" style={{ marginTop: 16 }}><h3>Recent activity</h3>{saved.requests.filter((r) => r.status === 'Completed').map((r) => <div className="table-row" key={r.id}><span>{r.service} · {r.id}</span><strong>{r.price}</strong></div>)}<div className="disclosure"><Info size={15} /> These are mock figures for a hackathon prototype, not actual earnings.</div></div></>;
  const ProviderProfile = () => <><PageHeading eyebrow="Provider workspace" title="Provider profile" subtitle="Configure a fictional provider profile for the demo." /><div className="card standard-card stack"><div className="provider-top"><div className="provider-avatar">RK</div><div><strong>Ravi Kumar</strong><div className="small muted">Sample roadside assistance provider</div></div></div><div className="table-row"><span>Services offered</span><span>Roadside support, battery help</span></div><div className="table-row"><span>Service area</span><span>Indiranagar, Bengaluru</span></div><div className="table-row"><span>Availability</span><span className="status-pill">Sample available</span></div><div className="disclosure"><Info size={15} /> Profile details are fixed sample data. Provider onboarding is not connected.</div></div></>;

  return <div className="app-shell">
    <header className="topbar"><Link href={mode === 'customer' ? '/' : '/provider'} className="brand" data-testid="link-brand-home"><span className="brand-mark"><MapPin size={20} /></span>LocalHelp<span style={{ color: '#d99c50', marginLeft: -8 }}>AI</span></Link>
      <div className="topbar-area" data-testid="text-service-area"><MapPin size={15} /><span><small>Service area</small><strong>{profile.area || 'Add an area in Profile'}</strong></span><span className="demo-tag">DEMO</span></div>
      <div className="mode-switch" role="group" aria-label="Switch app mode"><button className={mode === 'customer' ? 'active' : ''} data-testid="button-mode-customer" onClick={() => goMode('customer')}>Customer</button><button className={mode === 'provider' ? 'active' : ''} data-testid="button-mode-provider" onClick={() => goMode('provider')}>Provider demo</button></div>
    </header>
    <div className="app-layout"><aside className="sidebar"><div className="nav-caption">{mode === 'provider' ? 'Provider workspace' : 'Your help desk'}</div><NavItems /><div className="disclosure" style={{ marginTop: 22 }}><ShieldCheck size={14} /> Prototype mode. Sample data only; not connected to real providers.</div></aside>
      <main className="main-content"><Switch>
        <Route path="/" component={Home} /><Route path="/services" component={Services} /><Route path="/requests" component={Requests} /><Route path="/messages" component={Messages} /><Route path="/profile" component={Profile} />
        <Route path="/provider" component={ProviderHome} /><Route path="/provider/requests" component={ProviderRequests} /><Route path="/provider/jobs" component={ProviderJobs} /><Route path="/provider/earnings" component={ProviderEarnings} /><Route path="/provider/profile" component={ProviderProfile} />
        <Route><div className="card empty-state"><h2>Page not found</h2><Link href="/" className="btn">Return home</Link></div></Route>
      </Switch></main>
    </div>
    <nav className="mobile-nav" aria-label="Primary navigation"><NavItems mobile /></nav>
    {toast && <div className="toast-notice" role="status" data-testid="status-toast">{toast}</div>}
    {modal && <ModalShell title={modal.kind === 'review' ? 'Review your request' : modal.kind === 'location-consent' ? 'Share your location?' : modal.kind === 'manual-address' ? 'Share a manual location' : modal.kind === 'sharing' ? 'Location sharing controls' : modal.kind === 'confirm-stop' ? 'Stop location sharing?' : modal.kind === 'review-rating' ? 'Rate this demo service' : 'Sample provider profile'} onClose={() => setModal(null)} closeTestId="button-close-modal">
      {modal.kind === 'review' && selectedProvider && <div className="stack">
        <div className="disclosure" style={{ marginTop: 0 }}><Info size={16} /> Demo request only. Confirming it does not contact anyone or share your location.</div>
        <div className="provider-top"><div className="provider-avatar">{selectedProvider.initials}</div><div><strong>{selectedProvider.name}</strong><span className="demo-tag">DEMO PROVIDER</span><div className="small muted">{recommendation?.service ?? analysis?.issue} · sample provider</div></div></div>
        <div className="table-row"><span>Problem</span><strong>{issueText}</strong></div>
        {providedDetails.length > 0 && <div className="small muted">Additional details: {providedDetails.join(' · ')}</div>}
        <div className="table-row"><span>Estimated range</span><strong>{selectedProvider.range}</strong></div><div className="small muted">This is an estimate, not an exact price. Confirm cost and scope directly with a provider in a real service.</div>
        <div className="safety-banner"><ShieldCheck size={15} /> You can confirm the request without sharing a location. Sharing is a separate choice and can be stopped later.</div>
        <div className="stack" style={{ gap: 8 }}><button className="btn" data-testid="button-confirm-request" onClick={createRequest}><Check size={15} /> Confirm demo request</button><button className="btn ghost" data-testid="button-cancel-review" onClick={() => setModal(null)}>Go back</button></div>
      </div>}
      {modal.kind === 'location-consent' && <div className="stack">
        <div className="safety-banner"><strong>Your chosen provider can use your location to find you.</strong><br />It will be shared only for this service request and only after you approve. This prototype never sends your coordinates to a real person or service.</div>
        <label className="field-wrap" style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'row', gap: 9 }}><input type="checkbox" data-testid="checkbox-location-approval" id="location-consent-check" /> <span>I approve sharing my location with the selected demo provider for this request. I can revoke it at any time.</span></label>
        <button className="btn" data-testid="button-confirm-location-approval" onClick={() => {
          if (!(document.getElementById('location-consent-check') as HTMLInputElement | null)?.checked) { setToast('Confirm location sharing first, or continue without sharing.'); return; }
          if (!modal.requestId) return;
          if (!navigator.geolocation) { setToast('Browser location is unavailable. You can share a manually entered location instead.'); openManualAddress(modal.requestId); return; }
          const requestId = modal.requestId;
          navigator.geolocation.getCurrentPosition(() => enableLocationSharing(requestId, 'Approximate location · demo only'), () => { setToast('Location was not provided. You can use a manual address or continue without sharing.'); openManualAddress(requestId); }, { enableHighAccuracy: false, timeout: 7000 });
        }}><MapPin size={15} /> Confirm &amp; share location</button>
        <button className="btn secondary" data-testid="button-manual-address" onClick={() => modal.requestId && openManualAddress(modal.requestId)}>Enter an address instead</button>
        <button className="btn ghost" data-testid="button-location-not-now" onClick={() => { setModal(null); setToast('Your request stays active with location sharing off.'); }}>Not now · continue without sharing</button>
      </div>}
      {modal.kind === 'manual-address' && <form className="stack" onSubmit={(e) => { e.preventDefault(); const label = [manualAddress.address, manualAddress.area, manualAddress.pin, manualAddress.landmark && `Near ${manualAddress.landmark}`].filter(Boolean).join(', '); if (!modal.requestId) return; if (!label) { setToast('Add an address, area, PIN code, or landmark to continue.'); return; } if (!manualAddressConsent) { setToast('Approve sharing this address for this request, or continue without sharing.'); return; } enableLocationSharing(modal.requestId, `${label} · manual demo location`); }}>
        <div className="disclosure" style={{ marginTop: 0 }}><MapPin size={15} /> Share an address, area, PIN code, or landmark for this request only. The prototype does not transmit it to a real provider.</div>
        <label className="field-wrap">Address / street<input data-testid="input-address" value={manualAddress.address} onChange={(e) => setManualAddress({ ...manualAddress, address: e.target.value })} placeholder="House, building or street" /></label>
        <div className="form-grid"><label className="field-wrap">Area<input data-testid="input-area" value={manualAddress.area} onChange={(e) => setManualAddress({ ...manualAddress, area: e.target.value })} placeholder="Neighbourhood" /></label><label className="field-wrap">PIN code<input data-testid="input-pin" inputMode="numeric" value={manualAddress.pin} onChange={(e) => setManualAddress({ ...manualAddress, pin: e.target.value })} placeholder="6-digit PIN" /></label></div>
        <label className="field-wrap">Landmark (optional)<input data-testid="input-landmark" value={manualAddress.landmark} onChange={(e) => setManualAddress({ ...manualAddress, landmark: e.target.value })} placeholder="Nearby landmark" /></label>
        <label className="field-wrap" style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'row', gap: 9 }}><input type="checkbox" data-testid="checkbox-manual-address-approval" checked={manualAddressConsent} onChange={(e) => setManualAddressConsent(e.target.checked)} /> <span>I approve sharing this address with the selected demo provider for this request.</span></label>
        <button className="btn" data-testid="button-submit-manual-address" type="submit">Share this address for this request</button><button type="button" className="btn ghost" data-testid="button-manual-not-now" onClick={() => { setModal(null); setToast('Your request stays active with location sharing off.'); }}>Not now · keep location private</button>
      </form>}
      {modal.kind === 'sharing' && (() => {
        const request = saved.requests.find((r) => r.id === modal.requestId);
        return request ? <div className="stack"><div className="safety-banner"><strong>{request.shared ? 'Sharing is active for this request.' : 'Location sharing is off.'}</strong><br />Sharing label: {request.shared ? request.address : 'Not shared'}. The demo never transmits this to a real provider.</div>{request.shared ? <button className="btn danger" data-testid={`button-stop-sharing-${request.id}`} onClick={() => setModal({ kind: 'confirm-stop', requestId: request.id })}>Stop sharing location</button> : <><button className="btn" data-testid={`button-share-location-${request.id}`} onClick={() => setModal({ kind: 'location-consent', requestId: request.id })}>Share location for this request</button><button className="btn secondary" data-testid={`button-share-manual-${request.id}`} onClick={() => openManualAddress(request.id)}>Enter a manual location</button></>}<button className="btn ghost" data-testid="button-close-sharing" onClick={() => setModal(null)}>Close</button></div> : null;
      })()}
      {modal.kind === 'confirm-stop' && <div className="stack"><div className="safety-banner">Stop sharing your location with this provider? The request will remain in your history, but its location will no longer be visible in the provider demo.</div><button className="btn danger" data-testid="button-confirm-stop-sharing" onClick={() => modal.requestId && stopLocationSharing(modal.requestId)}>Stop sharing location</button><button className="btn secondary" data-testid="button-cancel-stop-sharing" onClick={() => setModal({ kind: 'sharing', requestId: modal.requestId })}>Keep sharing</button></div>}
      {modal.kind === 'review-rating' && <div className="stack"><p className="small muted">Rate this sample interaction. Your feedback stays in local demo history.</p><div style={{ display: 'flex', gap: 8 }} aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button aria-label={`Rate ${n} stars`} data-testid={`button-rating-${n}`} key={n} onClick={() => setReviewRating(n)} style={{ border: 0, background: 'transparent', color: n <= reviewRating ? '#d89d4d' : '#bbc4bc' }}><Star size={25} fill={n <= reviewRating ? 'currentColor' : 'none'} /></button>)}</div><label className="field-wrap">Optional note<textarea data-testid="input-review" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="What went well?" /></label><button className="btn" data-testid="button-submit-review" onClick={() => { updateRequests((rows) => rows.map((r) => r.id === modal.requestId ? { ...r, rating: reviewRating, review: reviewText } : r)); setModal(null); setToast('Demo rating saved locally.'); }}>Save rating</button></div>}
      {modal.kind === 'provider-profile' && selectedProvider && <div className="stack"><div className="provider-top"><div className="provider-avatar">{selectedProvider.initials}</div><div><strong>{selectedProvider.name}</strong><span className="demo-tag">DEMO PROVIDER</span><div className="provider-meta"><span><Star size={12} fill="#d89d4d" color="#d89d4d" /> {selectedProvider.rating} · {selectedProvider.reviews} sample reviews</span></div></div></div><p className="small muted">{selectedProvider.why}</p><div className="table-row"><span>Availability</span><span>{selectedProvider.available ? 'Sample available' : 'May be unavailable'}</span></div><div className="table-row"><span>Indicative range</span><strong>{selectedProvider.range}</strong></div><div className="disclosure"><Info size={15} /> Demo profile. Contact and calling affordances do not connect to a phone or real provider.</div><button className="btn" data-testid="button-profile-request" onClick={() => startRequest(selectedProvider.id)}>Review request <ArrowRight size={15} /></button><button className="btn secondary" data-testid="button-demo-call" onClick={() => { setModal(null); setToast('Calling is disabled in the prototype. No call was placed.'); }}><Phone size={15} /> Call (demo only)</button></div>}
    </ModalShell>}
  </div>;
}

function PageHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="muted small" style={{ margin: '8px 0 0' }}>{subtitle}</p></div></div>;
}
function FilterControls({ filterService, setFilterService, sortBy, setSortBy, availableOnly, setAvailableOnly }: { filterService: string; setFilterService: (v: string) => void; sortBy: string; setSortBy: (v: string) => void; availableOnly: boolean; setAvailableOnly: (v: boolean) => void }) {
  return <div className="filters"><label><Search size={14} /><select aria-label="Filter by service" data-testid="select-provider-service" value={filterService} onChange={(e) => setFilterService(e.target.value)}><option>All services</option>{categories.map((c) => <option key={c.name}>{c.name}</option>)}</select></label><label>Sort <select aria-label="Sort providers" data-testid="select-provider-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="recommended">Recommended</option><option value="nearest">Nearest</option><option value="rating">Top rated</option></select></label><label><input type="checkbox" data-testid="checkbox-available-only" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} /> Available now</label></div>;
}
function ProviderCards({ rows, onSelect, onContact, onProfile }: { rows: typeof demoProviders; onSelect: (id: string) => void; onContact: () => void; onProfile: (id: string) => void }) {
  return <div className="provider-list">{rows.map((p) => <article className="card provider-card" key={p.id} data-testid={`card-provider-${p.id}`}><div><div className="provider-top"><div className="provider-avatar">{p.initials}</div><div><div className="provider-name">{p.name}<span className="demo-tag">DEMO PROVIDER</span></div><div className="provider-meta"><span><Star size={12} fill="#d89d4d" color="#d89d4d" /> {p.rating} ({p.reviews} sample ratings)</span><span><MapPin size={12} /> {p.distance} km</span><span><Clock3 size={12} /> ~{p.eta} min</span></div></div></div><div className="why">{p.why}</div></div><div className="provider-price"><div><strong>{p.range}</strong><span>Indicative estimate · not exact</span></div><div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 9 }}><button className="btn secondary small-btn" data-testid={`button-provider-profile-${p.id}`} onClick={() => onProfile(p.id)}>Profile</button><button className="btn secondary small-btn" data-testid={`button-provider-contact-${p.id}`} onClick={onContact}><Phone size={13} /> Contact</button><button className="btn small-btn" data-testid={`button-select-provider-${p.id}`} onClick={() => onSelect(p.id)}>Request</button></div></div></article>)}</div>;
}
function RequestCard({ request: r, onStatus, onShare, onReview }: { request: ServiceRequest; onStatus: (id: string, status: RequestStatus) => void; onShare: () => void; onReview: () => void }) {
  const active = !['Completed', 'Cancelled'].includes(r.status);
  const next = stageOrder[stageOrder.indexOf(r.status) + 1];
  return <article className="card standard-card" data-testid={`card-request-${r.id}`}><div className="page-heading" style={{ marginBottom: 12 }}><div><div className="eyebrow">{r.id} · {new Date(r.created).toLocaleString()}</div><h3 style={{ margin: '6px 0' }}>{r.service}</h3><div className="small muted">Sample provider: {r.provider} <span className="demo-tag">DEMO</span></div></div><span className="status-pill" data-testid={`status-request-${r.id}`}>{r.status}</span></div>
    {r.problem && <div className="table-row"><span>Problem</span><strong>{r.problem}</strong></div>}{r.details && <div className="small muted" style={{ marginTop: 6 }}>Customer-provided details: {r.details}</div>}
    {active && <div className="alert-box" style={{ margin: '12px 0', background: '#f3f6f1', borderColor: '#dce6da', color: '#49665d' }}><strong>DEMO LIVE TRACKING — not real-time GPS</strong><br />Stepwise sample progress: {r.eta} min estimated · {r.distance} km sample distance. {r.shared ? 'Request-specific sharing is on.' : 'Location sharing is off.'}<div className="tracking-map"><div className="map-route" /><span className="map-dot" /><span className="map-home"><MapPin size={18} /></span></div></div>}
    <div className="table-row"><span>Estimated price range</span><strong>{r.price}</strong></div><div className="table-row"><span>Service-specific location sharing</span><span>{r.shared ? 'On' : 'Off'}</span></div>
    <div className="stack" style={{ gap: 8, marginTop: 12 }}>{active && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{next && <button className="btn small-btn" data-testid={`button-advance-${r.id}`} onClick={() => onStatus(r.id, next)}>Demo: mark {next.toLowerCase()} <ArrowRight size={13} /></button>}<button className="btn secondary small-btn" data-testid={`button-sharing-${r.id}`} onClick={onShare}>{r.shared ? <Eye size={13} /> : <EyeOff size={13} />} Sharing controls</button><button className="btn danger small-btn" data-testid={`button-cancel-${r.id}`} onClick={() => onStatus(r.id, 'Cancelled')}>Cancel</button></div>}
      {r.status === 'Completed' && (r.rating ? <div className="small muted">Your rating: {'★'.repeat(r.rating)}{r.review ? ` · ${r.review}` : ''}</div> : <button className="btn secondary small-btn" data-testid={`button-rate-${r.id}`} onClick={onReview}>Rate this demo service <Star size={13} /></button>)}
      {r.status === 'Cancelled' && <span className="small muted">Sharing ended when the request was cancelled.</span>}
    </div><div className="small muted" style={{ marginTop: 10 }}>This is a simulated request. No actual provider was contacted, and no location is sent to a real person or service.</div>
  </article>;
}
function ProviderRequestRow({ request: r, onStatus }: { request: ServiceRequest; onStatus: (id: string, status: RequestStatus) => void }) {
  const active = !['Completed', 'Cancelled'].includes(r.status);
  const next = stageOrder[stageOrder.indexOf(r.status) + 1];
  return <div className="table-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }} data-testid={`provider-request-${r.id}`}><div style={{ minWidth: 160, flex: 1 }}><strong>{r.service} · {r.id}</strong><div className="small muted">{r.status} · customer-approved location: {r.shared ? 'Available in demo' : 'Hidden'}</div>{r.problem && <div className="small muted">Problem: {r.problem}</div>}{r.details && <div className="small muted">Customer-provided details: {r.details}</div>}<div className="small muted">{r.shared ? r.address : 'Location hidden until customer approval'}</div></div><span className="status-pill">{r.status}</span>{active && <div style={{ display: 'flex', gap: 6 }}><button className="btn secondary small-btn" data-testid={`button-provider-accept-${r.id}`} onClick={() => onStatus(r.id, r.status === 'Requested' ? 'Accepted' : next || 'Completed')}>{r.status === 'Requested' ? 'Accept demo' : `Mark ${next?.toLowerCase() || 'complete'}`}</button>{r.status !== 'Requested' && <button className="btn small-btn" data-testid={`button-provider-next-${r.id}`} onClick={() => onStatus(r.id, next || 'Completed')}>Next step <ArrowRight size={12} /></button>}</div>}</div>;
}
function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return <div className="card stat-card" data-testid={`stat-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="small muted">{label}</span><Icon size={16} color="#548478" /></div><div className="value">{value}</div></div>;
}
function ModalShell({ title, children, onClose, closeTestId }: { title: string; children: ReactNode; onClose: () => void; closeTestId: string }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title} data-testid="dialog-modal"><div className="modal-head"><div><div className="eyebrow">LocalHelp AI · demo</div><h2 style={{ margin: '5px 0 0', fontSize: 21 }}>{title}</h2></div><button className="icon-btn" aria-label="Close" data-testid={closeTestId} onClick={onClose}><X size={17} /></button></div>{children}</section></div>;
}
function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppShell /></WouterRouter>;
}
export default App;
