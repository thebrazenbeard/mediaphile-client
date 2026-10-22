import type { components } from './generated/schema'
export type Item = components['schemas']['Item']
export type Library = components['schemas']['Library']
export type ItemDetail = components['schemas']['ItemDetail']
export type ItemPage = components['schemas']['ItemPage']
export type ServerInfo = components['schemas']['ServerInfo']
export type Capabilities = components['schemas']['PlaybackCapabilities']
export type PlaybackDecision = components['schemas']['PlaybackDecision']
export type PlaybackState = components['schemas']['PlaybackState']
export type PlaybackSession = components['schemas']['PlaybackSession']
export type Knowledge = components['schemas']['Knowledge']
export type User = components['schemas']['User']
export type MediaSource = components['schemas']['MediaSource']
export type MediaPart = components['schemas']['MediaPart']

export type ContinueWatchingPage = components['schemas']['ContinueWatchingPage']
export type ContinueWatchingEntry = components['schemas']['ContinueWatchingEntry']

// Subtitle review is intentionally separate from playback/ingestion qualification.
export type SubtitleAudit = { status:'ready'|'needs_review'; cues:number; sha256:string; ocr:Array<{token:string;suggestion:string;line:number}>; warnings:string[] }
export type SubtitleCandidate = {id:string;name:string;language:string;bytes:number;audit:SubtitleAudit}
export type SubtitleReview = {englishEmbedded:boolean;existing:string[];existingAudits:Array<{name:string;language:string;status:string;audit?:SubtitleAudit;reason?:string}>;candidates:SubtitleCandidate[];coverage:string}
export type SubtitlePart = {partId:string;fileName:string;review:SubtitleReview;embedded:Array<{index:number;codec:string;status:string;audit?:SubtitleAudit;reason?:string}>}
export type SubtitleOverview = {items:SubtitlePart[];total:number;offset:number;limit:number}
export type SubtitleInstallation = {destination:string;sha256:string;bytes:number;source:string}
