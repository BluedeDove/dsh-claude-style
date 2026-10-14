'use strict'
const fs=require('node:fs'),path=require('node:path'),{PNG}=require('pngjs')
const {contentLayoutScenario}=require('./content-layout.cjs')
const {check}=require('./lane.cjs')
const imageFlowScenario={
 ...contentLayoutScenario,script:'imageFlow',prompt:'检查 Markdown 引用图片与后续文字',
 async beforeSend(context){
  await contentLayoutScenario.beforeSend(context)
  for(const [name,width,height] of [['alignment.png',1920,660],['tall.png',800,1400]]){
   const image=new PNG({width,height})
   for(let i=0;i<width*height;i++)image.data.set([47,78,136,255],i*4)
   fs.writeFileSync(path.join(context.home,'workspace',name),PNG.sync.write(image))
  }
 },
 async afterTurn(context){
  await contentLayoutScenario.afterTurn(context)
  context.notes.imageFlow=[]
  for(const width of [1440,1024,390,360]){
   await context.page.setViewportSize({width,height:1000});await context.page.waitForTimeout(200)
   context.notes.imageFlow.push(await context.page.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}}
    return {width:innerWidth,images:[...document.querySelectorAll('[data-chat-flow] img')].map(image=>{
     const media=image.closest('button')??image.closest('a')??image,paragraph=media.closest('p')
     return {alt:image.alt,loaded:image.complete&&image.naturalWidth>0,image:box(image),media:box(media),paragraph:paragraph?box(paragraph):null,next:paragraph?.nextElementSibling?box(paragraph.nextElementSibling):null}
    })}
   }))
  }
  const preview=context.page.getByAltText('居中图片',{exact:true});await preview.scrollIntoViewIfNeeded();await preview.click()
  await context.page.getByRole('dialog').waitFor();context.notes.zoom=true;await context.page.keyboard.press('Escape')
 },
 async assert(context){return [
  ...await contentLayoutScenario.assert(context),
  check('引用式、引用块及链接图片保留完整高度，后续文字从图片下方开始',context.notes.imageFlow.length===4&&context.notes.imageFlow.every(row=>row.images.length===3&&row.images.every(item=>item.loaded&&item.media.bottom>=item.image.bottom-1&&item.paragraph?.bottom>=item.image.bottom-1&&(!item.next||item.next.top>=item.image.bottom-1))),JSON.stringify(context.notes.imageFlow)),
  check('原生图片放大入口仍可用',context.notes.zoom===true),
 ]},
}
module.exports={imageFlowScenario}
