import asyncio, json, os, pathlib, subprocess
import edge_tts
ROOT=pathlib.Path(__file__).resolve().parents[1]
scenes=json.loads((ROOT/'scripts/scenes.json').read_text())
out=ROOT/'public/audio'
out.mkdir(parents=True,exist_ok=True)
async def main():
  timeline=[]
  for s in scenes:
    target=out/(s['id']+'.mp3')
    marks=[]
    stream=edge_tts.Communicate(s['text'],os.getenv('VOICE','pt-BR-AntonioNeural'),rate='+0%')
    with target.open('wb') as f:
      async for item in stream.stream():
        if item['type']=='audio': f.write(item['data'])
        elif item['type']=='WordBoundary':
          marks.append({'text':item['text'],'start':item['offset']/10000000,'end':(item['offset']+item['duration'])/10000000})
    duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(target)],text=True).strip())
    timeline.append({**s,'frames':max(60,round((duration+0.9)*30)),'durationSeconds':duration,'audio':f"audio/{s['id']}.mp3",'words':marks})
  (ROOT/'src/timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2))
  print('Duration:',sum(s['frames'] for s in timeline)/30)
asyncio.run(main())
