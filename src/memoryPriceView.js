import {mountMemorySpot} from './memorySpotView.js';
import './exportMomentum.css';

export function renderMemoryPriceView({shell,bindNav,activeGroup,onGroupChange}){
 document.querySelector('#app').innerHTML=shell(`<section class="memory-price-page"><p class="memory-price-source">출처: TrendForce · DRAMeXchange 공개 시장가격</p><section id="memory-price-root" class="export-section dram-spot-shell"></section><button type="button" class="text-button" data-feature-route="exports" data-feature-target="memory">반도체 수출 데이터도 확인하기 →</button></section>`,'반도체 가격 추적');
 bindNav();
 return mountMemorySpot(document.querySelector('#memory-price-root'),{bindNav,activeGroup,onGroupChange});
}
