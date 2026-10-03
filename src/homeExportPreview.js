import { loadExportMomentumSnapshot } from './exportMomentumData.js';
import { formatUsdBillion, formatSignedPct } from './exportMomentumModel.js';
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountHomeExportPreview(host) {
  let attempt=0;
  async function load(force=false) {
    const token=++attempt;
    host.querySelector('[data-export-preview-summary]').textContent='월간 수출 흐름을 확인하고 있어요.';
    try {
      const snapshot=await loadExportMomentumSnapshot({force});
      if(!host.isConnected||token!==attempt)return;
      host.querySelector('[data-export-preview-summary]').innerHTML=`<strong>${esc(snapshot.periodLabel)} · 총수출 ${esc(formatUsdBillion(snapshot.summary.exportsUsdBillion))}</strong><br>전년 동월 대비 ${esc(formatSignedPct(snapshot.summary.exportYoY))}<br><small>총괄 ${esc(snapshot.period)} · 품목 ${esc(snapshot.itemPeriod||'미제공')} · 국가 ${esc(snapshot.regionPeriod||'미제공')}</small>`;
      host.querySelector('[data-export-preview-retry]').hidden=true;
    } catch {
      if(!host.isConnected||token!==attempt)return;
      host.querySelector('[data-export-preview-summary]').textContent='월간 요약을 불러오지 못했어요. 수출 분석 화면에서 다시 확인할 수 있어요.';
      host.querySelector('[data-export-preview-retry]').hidden=false;
    }
  }
  host.querySelector('[data-export-preview-retry]').onclick=()=>void load(true);
  await load();
}
