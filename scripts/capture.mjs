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
 const search=page.locator('input[type="search"],input[name*="busca" i],input[placeholder*="buscar" i],input[placeholder*="pesquis" i],input[placeholder*="search" i]').first();
 if(await search.count()){
   await search.fill('Charmander');
   await search.press('Enter');
   await page.waitForTimeout(3500);
 }else{
   const candidate=page.getByRole('link',{name:/busca|pesquis/i}).first();
   if(await candidate.count()){await candidate.click();await page.waitForTimeout(1500);}
   const field=page.locator('input[type="text"],input[type="search"]').first();
   if(!await field.count())throw Error('Campo de pesquisa não encontrado');
   await field.fill('Charmander');await field.press('Enter');await page.waitForTimeout(3500);
 }
 if(page.url()===base)throw Error('Pesquisa não navegou para uma página de resultados');
 const text=await page.locator('body').innerText();
 if(!/Charmander/i.test(text))throw Error('Página de resultados não contém Charmander');
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
 await snap('checkout','Página real de detalhes, sem simular carrinho ou pagamento');
} catch(error) {
 manifest.warnings.push(String(error));
 console.error('Capture incomplete:',error);
 process.exitCode=1;
} finally {
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
 await browser.close();
}
