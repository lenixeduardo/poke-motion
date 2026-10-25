import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const out = path.resolve('public/captures');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'pt-BR',isMobile:true,hasTouch:true});
const base='https://www.ligapokemon.com.br/';
const manifest={createdAt:new Date().toISOString(),captures:[],warnings:[]};
async function snap(id,reason){
  const url=page.url();
  if(!url.startsWith('https://www.ligapokemon.com.br/'))throw Error('Unexpected domain: '+url);
  await page.locator('body').waitFor({state:'visible',timeout:20000});
  await page.screenshot({path:path.join(out,id+'.png'),animations:'disabled',fullPage:false});
  manifest.captures.push({id,url,reason,title:await page.title()});
  console.log(id,url);
}
async function go(url){await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(2500);}
try {
 await go(base);
 await snap('site','Homepage real');
 await snap('intro','Homepage real usada na introdução');
 async function diagnostic(label) {
   const details=await page.evaluate(()=>({
     url:location.href,title:document.title,
     body:document.body?.innerText?.slice(0,2500),
     inputs:[...document.querySelectorAll('input')].map(x=>({type:x.type,placeholder:x.placeholder,name:x.name,outer:x.outerHTML.slice(0,250)})),
     controls:[...document.querySelectorAll('button,a,[role="button"]')].filter(x=>/busca|pesquis|search|lupa|cartas/i.test(x.textContent||x.getAttribute('aria-label')||'')).slice(0,25).map(x=>x.outerHTML.slice(0,350))
   }));
   await fs.writeFile(path.join(out,'debug-'+label+'.json'),JSON.stringify(details,null,2));
   await page.screenshot({path:path.join(out,'debug-'+label+'.png'),fullPage:true});
   console.log('Diagnostic:',JSON.stringify(details).slice(0,4000));
 }
 async function locateSearch() {
   const selectors=[
     'input[type="search"]','input[name*="busca" i]','input[name*="search" i]',
     'input[placeholder*="buscar" i]','input[placeholder*="pesquis" i]',
     'input[placeholder*="search" i]','input[type="text"]',
     'input:not([type])','[role="searchbox"]','[contenteditable="true"]'
   ];
   for(const selector of selectors){
     const found=page.locator(selector);
     for(let i=0;i<await found.count();i++){
       if(await found.nth(i).isVisible())return found.nth(i);
     }
   }
   return null;
 }
 let search=await locateSearch();
 if(!search){
   const toggles=[
     page.getByRole('button',{name:/buscar|busca|pesquis|search/i}),
     page.getByRole('link',{name:/buscar|busca|pesquis|search/i}),
     page.locator('[aria-label*="search" i],[aria-label*="busca" i],[title*="busca" i],[title*="search" i]'),
     page.locator('button:has(svg),a:has(svg)')
   ];
   for(const group of toggles){
     for(let i=0;i<Math.min(await group.count(),8);i++){
       const candidate=group.nth(i);
       if(!await candidate.isVisible())continue;
       try{
         await candidate.click({timeout:1500});
         await page.waitForTimeout(400);
         search=await locateSearch();
         if(search)break;
       }catch{}
     }
     if(search)break;
   }
 }
 if(!search){
   await diagnostic('search-not-found');
   throw Error('Campo de pesquisa não encontrado; consulte debug-search-not-found.json/png');
 }
 await search.fill('Charmander');
 await search.press('Enter');
 await page.waitForTimeout(3500);
 if(page.url()===base){await diagnostic('search-no-navigation');throw Error('Pesquisa não navegou para resultados');}
 const text=await page.locator('body').innerText();
 if(!/Charmander/i.test(text)){await diagnostic('search-no-results');throw Error('Página de resultados não contém Charmander');}
 await snap('search','Resultados reais de Charmander');
 await snap('prices','Resultados reais para comparar anúncios; não representa preços específicos');
 await snap('end','Resultados reais usados no encerramento');
 const link=page.locator('a[href]').filter({hasText:/Charmander/i}).first();
 if(!await link.count())throw Error('Nenhum link verificável de Charmander para detalhes');
 const href=await link.getAttribute('href');
 if(!href)throw Error('Link do produto sem destino');
 await link.click({timeout:10000});await page.waitForTimeout(3000);
 if(page.url()===base)throw Error('Não navegou para detalhes');
 await snap('shop','Página real acessada a partir dos resultados');
 const cart=page.getByRole('button',{name:/adicionar.*carrinho|comprar/i}).first();
 const cartLink=page.getByRole('link',{name:/adicionar.*carrinho|comprar/i}).first();
 if(await cart.count())await cart.click({timeout:10000});
 else if(await cartLink.count())await cartLink.click({timeout:10000});
 else throw Error('Carrinho não acessível sem interação adicional: captura de checkout não realizada');
 await page.waitForTimeout(2500);
 const cartText=await page.locator('body').innerText();
 if(!/carrinho|finalizar pedido|meu pedido/i.test(cartText))throw Error('Carrinho não confirmado na página');
 await snap('checkout','Carrinho real, sem concluir compra ou fornecer dados pessoais');
} catch(error) {
 manifest.warnings.push(String(error));
 console.error('Capture incomplete:',error);
 process.exitCode=1;
} finally {
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
 await browser.close();
}
