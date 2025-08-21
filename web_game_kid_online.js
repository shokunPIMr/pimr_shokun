import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Volume2, CheckCircle2, TimerReset, Home, Download, Palette, Eraser, PaintBucket, Pencil } from "lucide-react";

// ======= Utility: Export helpers =======
function useExport(targetRef, defaultTitle = "ผลการเล่นเกมของหนู") {
  const [playerName, setPlayerName] = useState("");
  const title = playerName?.trim() ? `${defaultTitle} - ${playerName}` : defaultTitle;

  const exportJPG = async () => {
    if (!targetRef.current) return;
    const canvas = await html2canvas(targetRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const dataURL = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `${title}.jpg`;
    link.click();
  };

  const exportPDF = async () => {
    if (!targetRef.current) return;
    const canvas = await html2canvas(targetRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    pdf.addImage(imgData, "JPEG", (pageWidth - w) / 2, 20, w, h);
    pdf.save(`${title}.pdf`);
  };

  return { playerName, setPlayerName, exportJPG, exportPDF };
}

// ======= Layout & Shared UI =======
function PageHeader({ title, onHome }) {
  return (
    <div className="flex items-center justify-between p-4 md:p-6 bg-white sticky top-0 z-30 shadow">
      <div className="text-2xl md:text-3xl font-bold">{title}</div>
      <Button onClick={onHome} className="rounded-2xl text-base px-4 py-2 flex gap-2">
        <Home className="w-5 h-5" /> กลับหน้าแรก
      </Button>
    </div>
  );
}

function ExportBar({ name, setName, onJPG, onPDF }) {
  return (
    <div className="flex flex-col md:flex-row gap-3 items-center bg-white border rounded-2xl p-3 md:p-4 shadow-sm">
      <div className="flex items-center gap-2 w-full md:w-auto">
        <span className="whitespace-nowrap">พิมพ์ชื่อน้อง:</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น น้องมีนา" className="rounded-xl" />
      </div>
      <div className="flex gap-2 w-full md:w-auto">
        <Button onClick={onJPG} className="rounded-2xl w-full md:w-auto"><Download className="w-4 h-4 mr-2"/>บันทึก JPG</Button>
        <Button onClick={onPDF} variant="secondary" className="rounded-2xl w-full md:w-auto"><Download className="w-4 h-4 mr-2"/>บันทึก PDF</Button>
      </div>
    </div>
  );
}

// ======= Game 1: เลือกรูปที่ถูกต้อง (สัตว์) =======
// ใส่ข้อมูล 30 ข้อ: ใช้ URL รูป + เสียง
const ANIMAL_QUESTIONS = [
  // ตัวอย่าง 5 ข้อแรก — เพิ่มได้เรื่อยๆ จนครบ 30
  {
    question: "ช้างคือตัวไหน?",
    correctImg: "#code: ใส่ลิงก์ URL รูปช้าง",
    wrongImg: "#code: ใส่ลิงก์ URL รูปสัตว์อื่น (เช่น ม้า)",
    correctSound: "#code: ใส่ลิงก์ URL เสียงช้าง",
    wrongSound: "#code: ใส่ลิงก์ URL เสียงม้า",
  },
  {
    question: "สิงโตคือตัวไหน?",
    correctImg: "#code: URL รูปสิงโต",
    wrongImg: "#code: URL รูปเสือ",
    correctSound: "#code: URL เสียงสิงโต",
    wrongSound: "#code: URL เสียงเสือ",
  },
  {
    question: "แพนด้าคือตัวไหน?",
    correctImg: "#code: URL รูปแพนด้า",
    wrongImg: "#code: URL รูปแรคคูน",
    correctSound: "#code: URL เสียงแพนด้า",
    wrongSound: "#code: URL เสียงแรคคูน",
  },
  {
    question: "วาฬคือตัวไหน?",
    correctImg: "#code: URL รูปวาฬ",
    wrongImg: "#code: URL รูปลามา",
    correctSound: "#code: URL เสียงวาฬ",
    wrongSound: "#code: URL เสียงลามา",
  },
  {
    question: "ยีราฟคือตัวไหน?",
    correctImg: "#code: URL รูปยีราฟ",
    wrongImg: "#code: URL รูปอูฐ",
    correctSound: "#code: URL เสียงยีราฟ",
    wrongSound: "#code: URL เสียงอูฐ",
  },
  // ... เพิ่มจนถึง 30 ข้อ
];

function shufflePick10(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 10);
}

function AnimalChoiceGame({ onHome }) {
  const [deck] = useState(() => shufflePick10(ANIMAL_QUESTIONS));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null); // "left" | "right"
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [reveal, setReveal] = useState(false);
  const resultRef = useRef(null);
  const { playerName, setPlayerName, exportJPG, exportPDF } = useExport(resultRef, "ผลเกมเลือกภาพถูกต้อง");

  const q = deck[idx];
  const isLeftCorrect = Math.random() < 0.5;
  const leftImg = isLeftCorrect ? q.correctImg : q.wrongImg;
  const rightImg = isLeftCorrect ? q.wrongImg : q.correctImg;
  const leftSound = isLeftCorrect ? q.correctSound : q.wrongSound;
  const rightSound = isLeftCorrect ? q.wrongSound : q.correctSound;

  const play = (url) => {
    if (!url || url.startsWith("#code")) return;
    const audio = new Audio(url);
    audio.play();
  };

  const submit = () => {
    if (submitted) return;
    setSubmitted(true);
    const correct = (selected === "left" && isLeftCorrect) || (selected === "right" && !isLeftCorrect);
    if (correct) setScore((s) => s + 1);
    setReveal(true);
    setTimeout(() => {
      if (idx < deck.length - 1) {
        setIdx(idx + 1);
        setSelected(null);
        setSubmitted(false);
        setReveal(false);
      }
    }, 5000); // 5 วินาทีไปข้อถัดไป
  };

  const finished = idx === deck.length - 1 && reveal && submitted;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <PageHeader title="เกมเลือกภาพที่ถูกต้อง" onHome={onHome} />

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div ref={resultRef} className="bg-white rounded-3xl p-4 md:p-6 shadow">
          <div className="flex items-center justify-between">
            <div className="text-xl md:text-2xl font-bold">ข้อ {idx + 1} / {deck.length}</div>
            <div className="text-lg">คะแนน: <span className="font-bold">{score}</span></div>
          </div>

          <div className="text-2xl md:text-3xl font-semibold mt-2 mb-4">{q.question}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[{side:"left", img:leftImg, s:leftSound}, {side:"right", img:rightImg, s:rightSound}].map((it) => (
              <Card key={it.side} className={`rounded-3xl border-4 ${selected===it.side?"border-gray-400":"border-transparent"}`}>
                <CardContent className="p-3 md:p-4">
                  <div className="aspect-[4/3] w-full bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
                    {/* หากเป็น #code ให้ใส่ <img src="URL"/> เอง */}
                    <div className="text-center text-gray-400 px-3">
                      {String(it.img).startsWith("#code") ? (
                        <div>
                          <div className="text-sm">#code: วางรูปภาพ URL ตรงนี้</div>
                          <div className="text-xs break-words">{it.img}</div>
                        </div>
                      ) : (
                        <img src={it.img} alt="ตัวเลือก" className="object-cover w-full h-full"/>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button onClick={() => setSelected(it.side)} className="rounded-2xl text-base w-full">เลือก</Button>
                    <Button onClick={() => play(it.s)} variant="secondary" className="rounded-2xl"><Volume2 className="w-5 h-5"/></Button>
                  </div>
                  {reveal && ((it.side === "left" && isLeftCorrect) || (it.side === "right" && !isLeftCorrect)) && (
                    <div className="flex items-center gap-2 mt-2 text-green-600 font-semibold"><CheckCircle2 className="w-5 h-5"/>คำตอบที่ถูกต้อง</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={submit} disabled={!selected || submitted} className="rounded-2xl text-lg px-6 py-6">ส่งคำตอบ</Button>
          </div>
        </div>

        {finished && (
          <div className="space-y-3">
            <div className="text-xl md:text-2xl font-semibold">สรุปคะแนน: {score} / {deck.length}</div>
            <ExportBar name={playerName} setName={setPlayerName} onJPG={exportJPG} onPDF={exportPDF} />
          </div>
        )}
      </div>
    </div>
  );
}

// ======= Game 2: คณิต บวก/ลบ เลขฐานหน่วย =======
function buildProblems(n=30){
  const ops = ["+","-"];
  const arr=[];
  while(arr.length<n){
    const a=Math.floor(Math.random()*10);
    const b=Math.floor(Math.random()*10);
    const op=ops[Math.floor(Math.random()*ops.length)];
    if(op==='-' && a<b) continue; // เลี่ยงผลลบ
    arr.push({a,b,op});
  }
  return arr;
}

function MathGame({ onHome }){
  const [problems] = useState(()=>shufflePick10(buildProblems(30)));
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState(null); // 'left'|'right'
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const resultRef = useRef(null);
  const { playerName, setPlayerName, exportJPG, exportPDF } = useExport(resultRef, "ผลเกมคณิตบวก-ลบ");

  const p = problems[idx];
  const correct = p.op==='+'? p.a+p.b: p.a-p.b;
  const wrong = (()=>{ let v; do { v = correct + (Math.random()<0.5? -1:1) * (1+Math.floor(Math.random()*2)); } while(v<0 || v>18 || v===correct); return v; })();
  const leftIsCorrect = Math.random()<0.5;
  const L = leftIsCorrect? correct: wrong;
  const R = leftIsCorrect? wrong: correct;

  const submit = ()=>{
    if(submitted) return;
    setSubmitted(true);
    const ok = (choice==='left' && leftIsCorrect) || (choice==='right' && !leftIsCorrect);
    if(ok) setScore(s=>s+1);
  };

  const next = ()=>{
    if(idx < problems.length-1){
      setIdx(idx+1); setChoice(null); setSubmitted(false);
    }
  };

  const finished = idx===problems.length-1 && submitted;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <PageHeader title="เกมคณิต บวก/ลบ" onHome={onHome}/>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        <div ref={resultRef} className="bg-white rounded-3xl p-6 shadow">
          <div className="flex items-center justify-between">
            <div className="text-xl md:text-2xl font-bold">ข้อ {idx+1} / {problems.length}</div>
            <div className="text-lg">คะแนน: <span className="font-bold">{score}</span></div>
          </div>
          <div className="text-center my-6">
            <div className="text-5xl md:text-7xl font-extrabold tracking-wide">{p.a} {p.op} {p.b} = ?</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[{k:'left',v:L},{k:'right',v:R}].map(opt=> (
              <Card key={opt.k} className={`rounded-3xl border-4 ${choice===opt.k? 'border-gray-400':'border-transparent'}`}>
                <CardContent className="p-6">
                  <button onClick={()=>setChoice(opt.k)} className="w-full text-4xl md:text-6xl font-bold py-10 rounded-2xl bg-gray-50">
                    {opt.v}
                  </button>
                  {submitted && ((opt.k==='left' && leftIsCorrect) || (opt.k==='right' && !leftIsCorrect)) && (
                    <div className="flex items-center gap-2 mt-3 text-green-600 font-semibold"><CheckCircle2 className="w-5 h-5"/>คำตอบที่ถูกต้อง</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {!submitted ? (
              <Button onClick={submit} disabled={!choice} className="rounded-2xl text-lg px-6 py-6">ส่งคำตอบ</Button>
            ):(
              <Button onClick={next} className="rounded-2xl text-lg px-6 py-6">ข้อต่อไป</Button>
            )}
          </div>
        </div>

        {finished && (
          <div className="space-y-3">
            <div className="text-xl md:text-2xl font-semibold">สรุปคะแนน: {score} / {problems.length}</div>
            <ExportBar name={playerName} setName={setPlayerName} onJPG={exportJPG} onPDF={exportPDF} />
          </div>
        )}
      </div>
    </div>
  );
}

// ======= Game 3: เกมตีตัวตุ่น (Whack-a-Mole) =======
function WhackAMole({ onHome }){
  const HOLES = 6;
  const [moleIdx, setMoleIdx] = useState(null); // โผล่ 1 ตัวเท่านั้น
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180); // 3 นาที
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const boardRef = useRef(null);
  const { playerName, setPlayerName, exportJPG, exportPDF } = useExport(boardRef, "ผลเกมตีตัวตุ่น");

  useEffect(()=>{
    if(!started) return;
    const t = setInterval(()=> setTimeLeft(t=>{
      if(t<=1){ clearInterval(t); setEnded(true); return 0; }
      return t-1;
    }), 1000);
    // โผล่ตัวแรกทันที
    if(moleIdx===null) setMoleIdx(Math.floor(Math.random()*HOLES));
    return ()=> clearInterval(t);
  }, [started]);

  const hit = (i)=>{
    if(ended || !started) return;
    if(i===moleIdx){
      setScore(s=>s+10);
      // โผล่ตัวใหม่ทันทีจากรูอื่น
      let next;
      do { next = Math.floor(Math.random()*HOLES); } while(next===i);
      setMoleIdx(next);
    }
  };

  const reset = ()=>{ setScore(0); setTimeLeft(180); setStarted(false); setEnded(false); setMoleIdx(null); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <PageHeader title="เกมตีตัวตุ่น" onHome={onHome}/>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        <div ref={boardRef} className="bg-white rounded-3xl p-4 md:p-6 shadow">
          <div className="flex items-center justify-between">
            <div className="text-xl md:text-2xl font-bold">เวลา: {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
            <div className="text-xl md:text-2xl font-bold">คะแนน: {score}</div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            {Array.from({length:HOLES}).map((_,i)=> (
              <button key={i} onClick={()=>hit(i)} className="aspect-square rounded-3xl bg-amber-100 flex items-center justify-center text-4xl md:text-6xl shadow-inner">
                {moleIdx===i && (
                  <motion.div initial={{scale:0}} animate={{scale:1}} className="w-5/6 h-5/6 rounded-full bg-amber-500 flex items-center justify-center">
                    {/* แทนรูปตัวตุ่นด้วยวงกลม — ใส่รูปจริงได้ */}
                    <span className="text-white font-extrabold select-none">ตุ่น</span>
                  </motion.div>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-2 justify-end mt-4">
            {!started && !ended && (<Button onClick={()=>setStarted(true)} className="rounded-2xl text-lg px-6 py-6"><TimerReset className="w-5 h-5 mr-2"/>เริ่มเกม</Button>)}
            {(started && !ended) && (<Button onClick={()=>{setEnded(true);}} variant="secondary" className="rounded-2xl">จบก่อนเวลา</Button>)}
            {(ended) && (<Button onClick={reset} variant="secondary" className="rounded-2xl">เริ่มใหม่</Button>)}
          </div>
        </div>

        {ended && (
          <div className="space-y-3">
            <div className="text-xl md:text-2xl font-semibold">หมดเวลา! คะแนนรวม: {score}</div>
            <ExportBar name={playerName} setName={setPlayerName} onJPG={exportJPG} onPDF={exportPDF} />
          </div>
        )}
      </div>
    </div>
  );
}

// ======= Game 4: เกมระบายสี (Canvas + Flood Fill) =======
const COLOR_PALETTE = [
  "#000000","#FFFFFF","#FF0000","#00FF00","#0000FF","#FFFF00","#FF00FF","#00FFFF",
  "#C0C0C0","#808080","#800000","#808000","#008000","#800080","#008080","#000080",
  "#F4A460","#FFA500","#8B4513","#A52A2A","#FFC0CB","#FF69B4","#ADFF2F","#7FFF00",
  "#40E0D0","#1E90FF","#9370DB","#4B0082","#D2691E","#B8860B"
];

const LINE_ARTS = [
  "#code: URL รูปภาพขาว-ดำ 1",
  "#code: URL รูปภาพขาว-ดำ 2",
  // ... เพิ่มจนครบ 30
];

function getPixel(data, x, y, w){
  const i=(y*w+x)*4; return [data[i],data[i+1],data[i+2],data[i+3]];
}
function setPixel(data, x, y, w, [r,g,b,a]){
  const i=(y*w+x)*4; data[i]=r; data[i+1]=g; data[i+2]=b; data[i+3]=a;
}
function colorEq(c1,c2, tol=20){
  return Math.abs(c1[0]-c2[0])<=tol && Math.abs(c1[1]-c2[1])<=tol && Math.abs(c1[2]-c2[2])<=tol && Math.abs(c1[3]-c2[3])<=tol;
}

function floodFill(ctx, x, y, fillColor){
  const {width:w,height:h} = ctx.canvas;
  const imgData = ctx.getImageData(0,0,w,h);
  const data = imgData.data;
  const target = getPixel(data, x, y, w);
  // ไม่ทาทับเส้นดำเข้ม
  if(colorEq(target,[0,0,0,255],50)) return;
  const stack=[[x,y]];
  const visited=new Set();
  while(stack.length){
    const [cx,cy]=stack.pop();
    const key = cx+","+cy; if(visited.has(key)) continue; visited.add(key);
    if(cx<0||cy<0||cx>=w||cy>=h) continue;
    const cur = getPixel(data,cx,cy,w);
    if(colorEq(cur,target,25) && !colorEq(cur,[0,0,0,255],50)){
      setPixel(data,cx,cy,w,fillColor);
      stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
  }
  ctx.putImageData(imgData,0,0);
}

function ColoringGame({ onHome }){
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tool, setTool] = useState('pencil'); // pencil | bucket | eraser | clear
  const [color, setColor] = useState(COLOR_PALETTE[2]);
  const canvasRef = useRef(null);
  const bgRef = useRef(null);
  const workRef = useRef(null);
  const { playerName, setPlayerName, exportJPG, exportPDF } = useExport(workRef, "ผลงานระบายสี");

  useEffect(()=>{
    const url = LINE_ARTS[selectedIndex];
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    // รีเซ็ตพื้นหลังเป็นขาว
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,canvas.width, canvas.height);
    if(String(url).startsWith('#code')) return; // ผู้ใช้ใส่ภาพเอง
    const img = new Image(); img.crossOrigin="anonymous"; img.onload = ()=>{
      const ratio = Math.min(canvas.width/img.width, canvas.height/img.height);
      const w = img.width * ratio; const h = img.height * ratio;
      ctx.drawImage(img, (canvas.width-w)/2, (canvas.height-h)/2, w, h);
    }; img.src = url;
  }, [selectedIndex]);

  const onCanvasClick = (e)=>{
    const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX-rect.left) * (canvas.width/rect.width));
    const y = Math.floor((e.clientY-rect.top) * (canvas.height/rect.height));
    const ctx = canvas.getContext('2d');
    if(tool==='bucket'){
      const rgb = hexToRGBA(color);
      floodFill(ctx, x, y, [rgb.r, rgb.g, rgb.b, 255]);
    }
  };

  const onCanvasDraw = (e)=>{
    if(tool!=='pencil' && tool!=='eraser') return;
    const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const getXY = (ev)=>({
      x: (ev.clientX-rect.left) * (canvas.width/rect.width),
      y: (ev.clientY-rect.top) * (canvas.height/rect.height)
    });
    let drawing = true;
    const start = getXY(e);
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.lineWidth = tool==='pencil'? 8: 20;
    ctx.strokeStyle = tool==='pencil'? color: '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(start.x, start.y);

    const move = (ev)=>{
      if(!drawing) return; const p = getXY(ev);
      ctx.lineTo(p.x, p.y); ctx.stroke();
    };
    const up = ()=>{ drawing=false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  const clearAll = ()=>{
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,canvas.width, canvas.height);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <PageHeader title="เกมระบายสี" onHome={onHome}/>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-4 bg-white rounded-3xl p-3 md:p-4 shadow" ref={workRef}>
            <div className="w-full aspect-[4/3] bg-white border rounded-2xl overflow-hidden flex items-center justify-center">
              <canvas ref={canvasRef} width={1200} height={900}
                className="w-full h-full cursor-crosshair"
                onMouseDown={onCanvasDraw}
                onClick={onCanvasClick}
              />
            </div>
          </div>
          <div className="lg:col-span-1 bg-white rounded-3xl p-3 md:p-4 shadow space-y-3">
            <div className="font-semibold">เลือกภาพ (30 รูป)</div>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-auto pr-1">
              {LINE_ARTS.map((u,i)=> (
                <button key={i} onClick={()=>setSelectedIndex(i)} className={`aspect-square rounded-xl border ${selectedIndex===i? 'border-gray-800':'border-gray-200'} bg-gray-50 text-[10px] p-1 overflow-hidden`}> {String(u).startsWith('#code')? '#code URL': <img src={u} alt=""/>} </button>
              ))}
            </div>
            <div className="font-semibold mt-2">เครื่องมือ</div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={()=>setTool('pencil')} className={`rounded-2xl ${tool==='pencil'?'':'opacity-80'}`}><Pencil className="w-4 h-4 mr-2"/>วาด</Button>
              <Button onClick={()=>setTool('bucket')} className={`rounded-2xl ${tool==='bucket'?'':'opacity-80'}`}><PaintBucket className="w-4 h-4 mr-2"/>ถังเทสี</Button>
              <Button onClick={()=>setTool('eraser')} variant="secondary" className={`rounded-2xl ${tool==='eraser'?'':'opacity-80'}`}><Eraser className="w-4 h-4 mr-2"/>ยางลบ</Button>
              <Button onClick={clearAll} variant="secondary" className="rounded-2xl">ลบสีทั้งหมด</Button>
            </div>
            <div className="font-semibold mt-2">เลือกสี</div>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PALETTE.map((c,i)=> (
                <button key={i} onClick={()=>setColor(c)} title={c} className={`w-8 h-8 rounded-full border ${color===c?'border-black':'border-gray-200'}`} style={{background:c}}/>
              ))}
            </div>
            <div className="mt-2">
              <ExportBar name={playerName} setName={setPlayerName} onJPG={exportJPG} onPDF={exportPDF} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helpers
function hexToRGBA(hex){
  const c = hex.replace('#','');
  const n = parseInt(c,16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255, a:255 };
}

// ======= Home: 5 คอลัมน์, การ์ดใหญ่, เพิ่มเกมง่าย =======
const GAMES = [
  { key: 'animal', title: 'เกมเลือกภาพที่ถูกต้อง', description: 'แตะเลือกรูปสัตว์ให้ตรงโจทย์ มีเสียงประกอบ', cover: '#code: URL รูปหน้าปกเกมสัตว์' },
  { key: 'math', title: 'เกมคณิต บวก/ลบ', description: 'โจทย์ 10 ข้อจาก 30 ข้อ ตอบง่าย', cover: '#code: URL รูปหน้าปกเกมคณิต' },
  { key: 'mole', title: 'เกมตีตัวตุ่น', description: 'ตีตัวตุ่นจาก 6 รู ภายใน 3 นาที', cover: '#code: URL รูปหน้าปกตุ่น' },
  { key: 'coloring', title: 'เกมระบายสี', description: 'ระบายสีด้วยดินสอ/ถังสี/ยางลบ', cover: '#code: URL รูปหน้าปกระบายสี' },
  // เพิ่มเกมใหม่ได้โดย push รายการเข้ามา
];

export default function KindergartenGamesApp(){
  const [route, setRoute] = useState('home');

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-sky-50">
      {route==='home' && (
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="text-center mb-6 md:mb-10">
            <div className="text-3xl md:text-5xl font-extrabold">สวนสนุกการเรียนรู้ของหนูอนุบาล</div>
            <div className="mt-2 text-gray-600">แตะที่รูปใหญ่ ๆ เพื่อเข้าเล่นเกมได้เลย เพิ่มเกมใหม่ได้เรื่อย ๆ</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {GAMES.map(g=> (
              <Card key={g.key} className="rounded-3xl shadow hover:shadow-lg transition">
                <button onClick={()=>setRoute(g.key)} className="w-full text-left">
                  <CardContent className="p-3 md:p-4">
                    <div className="aspect-[4/3] w-full bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
                      {String(g.cover).startsWith('#code')? (
                        <div className="text-center text-gray-400 text-xs px-2">#code: วาง URL รูปหน้าปก</div>
                      ):(
                        <img src={g.cover} alt="" className="object-cover w-full h-full"/>
                      )}
                    </div>
                    <div className="mt-2 md:mt-3">
                      <div className="font-bold text-base md:text-lg leading-tight">{g.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{g.description}</div>
                    </div>
                  </CardContent>
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {route==='animal' && <AnimalChoiceGame onHome={()=>setRoute('home')}/>} 
      {route==='math' && <MathGame onHome={()=>setRoute('home')}/>} 
      {route==='mole' && <WhackAMole onHome={()=>setRoute('home')}/>} 
      {route==='coloring' && <ColoringGame onHome={()=>setRoute('home')}/>} 
    </div>
  );
}
