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
export type SubtitleDecision = {partId:string;disposition:'active'|'skip'|'review';reason:string;updatedAt?:string}
export type SubtitlePart = {partId:string;fileName:string;review:SubtitleReview;decision?:SubtitleDecision;nextAction?:string;embedded:Array<{index:number;codec:string;status:string;audit?:SubtitleAudit;reason?:string}>}
export type SubtitleOverview = {items:SubtitlePart[];total:number;offset:number;limit:number}
export type SubtitleInstallation = {destination:string;sha256:string;bytes:number;source:string}


export type SubtitleQueueItem = {
 partId:string;fileName:string;action:
 'excluded'|'manual_review'|'covered'|'inspect_existing'|'review_local_candidate'|'search_published';
 coverage:string;disposition:SubtitleDecision['disposition'];candidateCount:number;
 observedSize:number;observedModTimeNs:string;updatedAt?:string
}
export type SubtitleQueuePage={planned:number;items:SubtitleQueueItem[];total:number;offset:number;limit:number}


export type PublishedSubtitleCandidate={
 provider:string;subtitleId:string;fileId:number;release:string;fileName:string;
 language:string;trusted:boolean;hearingImpaired:boolean;moviehashMatch:boolean
}
export type PublishedSubtitleSearchReply={
 partId:string;provider:string;candidates:PublishedSubtitleCandidate[];
 downloaded:boolean;published:boolean;note:string
}
export type PublishedSubtitleStageReply={
 partId:string;downloaded:boolean;published:false;note:string;
 stage:{provider:string;fileId:number;stageId:string;sha256:string;audit:SubtitleAudit;readyForReview:boolean}
}
export type PublishedSubtitleStageReview={
 partId:string;stageId:string;provider:string;fileId:number;sha256:string;
 audit:SubtitleAudit;text:string;readyForReview:boolean;published:false
}
export type PublishedSubtitleInstallation={destinationName:string;sha256:string;bytes:number;source:string;alreadyInstalled:boolean}
