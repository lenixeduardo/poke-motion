import React from 'react';
import {AbsoluteFill,Audio,Img,Sequence,staticFile,useCurrentFrame,useVideoConfig,interpolate,spring} from 'remotion';
import timeline from './timeline.json';
type Word={text:string;start:number;end:number};
type SceneData={id:string;title:string;text:string;frames:number;durationSeconds:number;audio:string;words:Word[]};
const scenes=timeline as SceneData[];
const yellow='#ffce32';
const Scene:React.FC<{scene:SceneData;index:number}>=({scene,index})=>{
 const frame=useCurrentFrame();const {fps}=useVideoConfig();const now=frame/fps;
 const tokens=scene.words.length?scene.words:scene.text.split(/\s+/).map((text,i,all)=>({text,start:i*scene.durationSeconds/all.length,end:(i+1)*scene.durationSeconds/all.length}));
 const blocks:Word[][]=[];
 for(let i=0;i<tokens.length;i+=5)blocks.push(tokens.slice(i,i+5));
 const block=blocks.find(b=>now>=b[0].start&&now<b[b.length-1].end)??(now<tokens[0].start?blocks[0]:blocks[blocks.length-1]);
 const blockIndex=blocks.indexOf(block);
 const active=Math.max(0,block.findIndex(w=>now<w.end));
 const spoken=block.findIndex(w=>now<w.end)===-1?block.length-1:active;
 const entrance=spring({frame:Math.max(0,frame-Math.round(block[0].start*fps)),fps,config:{damping:17,stiffness:170}});
 const zoom=interpolate(frame,[0,scene.frames],[1,1.05],{extrapolateRight:'clamp'});
 const titles=['A CARTA QUE FALTA','ABRA O SITE','PESQUISE','COMPARE','ESCOLHA A LOJA','FINALIZE','SUA COLEÇÃO'];
 return <AbsoluteFill style={{background:'radial-gradient(circle at 70% 30%,#2b426f,#090e22 75%)',color:'white',fontFamily:'Arial, sans-serif',overflow:'hidden'}}>
  <div style={{position:'absolute',top:95,left:70,fontWeight:900,fontSize:36,letterSpacing:2,color:yellow}}>POKE ACHADINHOS <span style={{color:'white'}}>DO EDU</span></div>
  <div style={{position:'absolute',top:250,left:70,right:70}}>
   <div style={{color:yellow,fontSize:32,fontWeight:900}}>PASSO {index+1} / 7</div>
   <div style={{fontSize:78,fontWeight:900,marginTop:28,lineHeight:1.05}}>{titles[index]}</div>
  </div>
  <div style={{position:'absolute',top:570,left:80,right:80,height:940,display:'flex',alignItems:'center',justifyContent:'center',transform:`scale(${zoom})`}}>
    <div style={{position:'relative',width:790,height:900,borderRadius:35,overflow:'hidden',border:'3px solid #ffffff38',background:'#111b32',boxShadow:'0 35px 100px #000b'}}>
      <Img src={staticFile('captures/'+scene.id+'.png')} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:14,background:'#060c20cc',fontSize:21,textAlign:'center'}}>Captura real da Liga Pokémon</div>
    </div>
  </div>
  <div style={{position:'absolute',bottom:140,left:65,right:65,minHeight:155,padding:'30px 20px',background:'#050a1de8',border:'1px solid #ffffff40',borderRadius:28,display:'flex',justifyContent:'center',alignItems:'center'}}>
    <div key={blockIndex} style={{display:'flex',flexWrap:'wrap',gap:'8px 12px',justifyContent:'center',transform:`translateY(${(1-entrance)*25}px)`,opacity:entrance,fontSize:43,fontWeight:900,textAlign:'center'}}>
      {block.map((w,i)=><span key={i} style={{color:i===spoken?'#111525':'white',background:i===spoken?yellow:'transparent',borderRadius:9,padding:'2px 7px'}}>{w.text}</span>)}
    </div>
  </div>
  <div style={{position:'absolute',bottom:0,left:0,width:`${Math.min(100,frame/scene.frames*100)}%`,height:12,background:yellow}}/>
 </AbsoluteFill>;
};
export const Tutorial:React.FC=()=>{
 let start=0;
 return <AbsoluteFill>{scenes.map((scene,index)=>{const from=start;start+=scene.frames;return <Sequence key={scene.id} from={from} durationInFrames={scene.frames}><Scene scene={scene} index={index}/><Audio src={staticFile(scene.audio)}/></Sequence>})}</AbsoluteFill>;
};
