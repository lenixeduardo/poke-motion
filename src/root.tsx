import React from 'react';
import {Composition} from 'remotion';
import {Tutorial} from './tutorial';
import timeline from './timeline.json';
export const Root:React.FC=()=> <Composition id="Tutorial" component={Tutorial} width={1080} height={1920} fps={30} durationInFrames={timeline.reduce((n,s)=>n+s.frames,0)}/>;
