// Editorially reviewed real-world photographs. Every entry has a source, creator, license,
// and company/product identity. Images are served as Wikimedia Commons thumbnails.
// No arbitrary image search or generated/"AI" photography occurs at runtime.
// NOTE: these are *external* image assets; Commons is the image host.
const PHOTOS=Object.freeze({
  '003230': Object.freeze({
    type:'company-product',
    title:'삼양 불닭볶음면 조리 사진',
    description:'삼양식품 불닭볶음면을 조리한 실제 사진 · 특정 연도 제품',
    imageUrl:'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Buldak_Ramen_20210114_004.jpg/960px-Buldak_Ramen_20210114_004.jpg',
    sourceUrl:'https://commons.wikimedia.org/wiki/File:Buldak_Ramen_20210114_004.jpg',
    creator:'Mobius6',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
    reviewDate:'2026-11-02',modification:'원본을 Commons에서 960px 크기로 축소한 이미지',
  }),
  '000660':Object.freeze({
    type:'company-product',
    title:'SK하이닉스 SOCAMM 메모리 모듈',
    description:'2025 Computex에 전시된 SK하이닉스 SOCAMM 메모리 모듈',
    imageUrl:'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/SK_Hynix_SOCAMM_module_Computex_2025.jpg/960px-SK_Hynix_SOCAMM_module_Computex_2025.jpg',
    sourceUrl:'https://commons.wikimedia.org/wiki/File:SK_Hynix_SOCAMM_module_Computex_2025.jpg',
    creator:'4300streetcar',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
    reviewDate:'2026-11-02',modification:'원본을 Commons에서 960px 크기로 축소한 이미지',
  }),
  '005930':Object.freeze({
    type:'company-product',
    title:'삼성전자 SSD 990 PRO 4TB',
    description:'삼성전자 NVMe SSD 990 PRO 제품의 실제 사진',
    imageUrl:'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/SAMSUNG_M.2_NVMe_SSD_990_PRO_4TB_%282%29.jpg/960px-SAMSUNG_M.2_NVMe_SSD_990_PRO_4TB_%282%29.jpg',
    sourceUrl:'https://commons.wikimedia.org/wiki/File:SAMSUNG_M.2_NVMe_SSD_990_PRO_4TB_(2).jpg',
    creator:'Dinkun Chen',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
    reviewDate:'2026-11-02',modification:'원본을 Commons에서 960px 크기로 축소한 이미지',
  }),
  '062040':Object.freeze({
    type:'industry-example',
    title:'변전소 전력 변압기',
    description:'전력기기 산업의 실제 설비 사진 · 산일전기에서 생산한 제품이라는 근거는 없음',
    imageUrl:'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Transformer_at_substation.jpg/960px-Transformer_at_substation.jpg',
    sourceUrl:'https://commons.wikimedia.org/wiki/File:Transformer_at_substation.jpg',
    creator:'Wikideas1',license:'CC0 1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',
    reviewDate:'2026-11-02',modification:'원본을 Commons에서 960px 크기로 축소한 이미지',
  }),
});
const CATALOGS=Object.freeze({
  '278470':Object.freeze({
    label:'에이피알 메디큐브 AGE-R 공식 디바이스 라인업',
    url:'https://www.themedicube.kr/age-r/main2.html',
    message:'메디큐브 제품 사진은 공식 카탈로그에서 확인하세요. 재사용 허가된 이미지 파일은 아직 등록되지 않았습니다.',
  }),
});
const sixDigits=value=>{
  const code=String(value||'').trim().toUpperCase();
  return /^\d{6}(?:\.(?:KS|KQ))?$/.test(code)?code.slice(0,6):null;
};
const verified=photo=>{
  if(!photo)return false;
  try{
    const image=new URL(photo.imageUrl),source=new URL(photo.sourceUrl),license=new URL(photo.licenseUrl);
    return image.protocol==='https:'&&image.hostname==='thumb.wikimedia.org'&&
      image.pathname.startsWith('/wikipedia/commons/thumb/')&&
      source.protocol==='https:'&&source.hostname==='commons.wikimedia.org'&&
      source.pathname.startsWith('/wiki/File:')&&
      license.protocol==='https:'&&license.hostname==='creativecommons.org'&&
      ['CC BY 4.0','CC BY-SA 4.0','CC0 1.0'].includes(photo.license)&&
      Boolean(photo.creator&&photo.title&&photo.description)&&
      ['company-product','industry-example'].includes(photo.type);
  }catch{return false;}
};
export function curatedProductPhoto(ticker) {
  const photo=PHOTOS[sixDigits(ticker)];
  return verified(photo)?photo:null;
}
export function officialProductCatalog(ticker) {
  return CATALOGS[sixDigits(ticker)]||null;
}
export function allCuratedPhotos(){return Object.entries(PHOTOS).map(([ticker,photo])=>({ticker,...photo}));}
