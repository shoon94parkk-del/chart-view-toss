import {createPublicationJournal} from './publicationJournal.js';
import {BRIEFING_KEY,readStored,writeStored,getStorageContext,isStorageContextCurrent} from './storage.js';
import {mountHomeChanges as mount} from './homeChangesView.js';
const journal=createPublicationJournal({
 read:()=>readStored(BRIEFING_KEY),
 write:(value,options)=>writeStored(BRIEFING_KEY,value,options),
 getContext:getStorageContext,
 isCurrent:isStorageContextCurrent,
});
export const mountHomeChanges=host=>mount(host,{journal});
