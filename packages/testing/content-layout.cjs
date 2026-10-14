'use strict'
const fs = require('node:fs'), path = require('node:path')
const {check} = require('./lane.cjs')
const {sanitizePage} = require('../../scripts/shared/privacy.cjs')
const {PNG} = require('pngjs')

const contentLayoutScenario = {
  script:'visuals', prompt:'检查图片、表格和内容卡片布局', viewport:{width:1440,height:1000},
  patch:['- id: ui-skin-claude-maintained', '  config:', '    username: Ada', '    brand: deepseek'],
  async beforeSend({page,home,notes,out}) {
    const image=new PNG({width:240,height:120})
    for(let y=0;y<120;y++) for(let x=0;x<240;x++) {
      const at=(y*240+x)*4, circle=(x-120)**2+(y-60)**2<900
      image.data.set(circle?[238,241,248,255]:[77,107,254,255],at)
    }
    fs.writeFileSync(path.join(home,'workspace','alignment.png'),PNG.sync.write(image))
    await page.waitForSelector('.dsh-claude-home-panel:visible')
    notes.home=[]
    for (const width of [1440,1024,390]) {
      await page.setViewportSize({width,height:1000})
      await page.waitForTimeout(300)
      notes.home.push(await page.evaluate(() => {
        const box=e=>{const r=e.getBoundingClientRect();return {centre:r.x+r.width/2,width:r.width,left:r.left,right:r.right}}
        const panel=document.querySelector('.dsh-claude-home-panel')
        const stack=panel.closest('[class*="_composerStack"]')
        const headline=stack.querySelector('[class*="_headline"]')
        return {width:innerWidth,panel:box(panel),stack:box(stack),headline:box(headline),scrollWidth:document.documentElement.scrollWidth}
      }))
    }
    await page.setViewportSize({width:1440,height:1000})
    await page.evaluate(()=>document.body.setAttribute('data-ds-dark-theme',''))
    await sanitizePage(expression=>page.evaluate(expression))
    await page.screenshot({path:path.join(out,'content-home-dark.png')})
  },
  async afterTurn({page,notes,out}) {
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-chat-flow] img')].some(e=>e.complete&&e.naturalWidth>0))
    notes.content=[]
    for (const width of [1440,1024,390,360]) {
      await page.setViewportSize({width,height:1000})
      await page.waitForTimeout(350)
      notes.content.push(await page.evaluate(() => {
        const image=[...document.querySelectorAll('[data-chat-flow] img')].find(e=>e.alt==='居中图片')
        const box=e=>{const r=e.getBoundingClientRect();return {centre:r.x+r.width/2,width:r.width,left:r.left,right:r.right}}
        const media=image.closest('button')??image
        const diagram=document.querySelector('[data-genui-mermaid] > svg')
        const widgets=[...document.querySelectorAll('[data-chat-flow] [data-genui]')]
        const paragraph=[...document.querySelectorAll('[data-chat-flow] p')].find(e=>e.textContent.includes('正文保持'))
        return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,image:box(image),media:box(media),parent:box(media.parentElement),
          paragraphAlign:getComputedStyle(paragraph).textAlign,table:!!document.querySelector('[data-chat-flow] table'),
          diagram:diagram?{box:box(diagram),parent:box(diagram.parentElement)}:null,
          widgets:widgets.map(e=>({box:box(e),parent:box(e.parentElement)}))}
      }))
      if (width===1440||width===390) {
        for (const scheme of ['light','dark']) {
          await page.evaluate(dark=>document.body.toggleAttribute('data-ds-dark-theme',dark),scheme==='dark')
          await sanitizePage(expression=>page.evaluate(expression))
          await page.screenshot({path:path.join(out,`content-${width}-${scheme}.png`)})
        }
      }
    }
  },
  async assert({notes,session}) {
    const homes=notes.home??[], rows=notes.content??[]
    return [
      check('the studio greeting and dashboard share the composer centre at desktop and phone widths',homes.length===3&&homes.every(r=>Math.abs(r.panel.centre-r.stack.centre)<1&&Math.abs(r.headline.centre-r.stack.centre)<1&&r.scrollWidth===r.width),JSON.stringify(homes)),
      check('image previews stay centred with their complete native hit target',rows.length===4&&rows.every(r=>Math.abs(r.image.centre-r.parent.centre)<1&&Math.abs(r.media.centre-r.parent.centre)<1&&r.image.width<=r.media.width&&r.scrollWidth===r.width),JSON.stringify(rows)),
      check('tables render and prose keeps its normal reading direction',rows.every(r=>r.table&&r.paragraphAlign!=='center'),JSON.stringify(rows.map(r=>({width:r.width,align:r.paragraphAlign,table:r.table})))),
      check('rendered Mermaid and generated cards share the centre of their available space',rows.every(r=>(!r.diagram||Math.abs(r.diagram.box.centre-r.diagram.parent.centre)<1)&&r.widgets.every(w=>Math.abs(w.box.centre-w.parent.centre)<1)),JSON.stringify(rows.map(r=>({width:r.width,diagram:r.diagram,widgets:r.widgets})))),
      check('控制台没有异常',session.problems.length===0,session.problems.slice(0,3).join(' | ')),
    ]
  },
}
module.exports={contentLayoutScenario}
