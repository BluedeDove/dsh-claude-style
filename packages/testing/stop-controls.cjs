'use strict'
const path=require('node:path')
const {check}=require('./lane.cjs')
const {waitForSkin,dismissOverlays}=require('./dsh-web.cjs')
const {sanitizePage}=require('../../scripts/shared/privacy.cjs')
const {createImportanceAudit,planImportance}=require('./importance.cjs')

function stopControlsScenario({native,width,typing}){
 return {
  script:'process',prompt:'暂停按钮可点击检查',turnTailState:'attached',viewport:{width:native?390:width,height:900},
  async beforeSend({page}){
   await page.route('**/plugins/**',async route=>{
    if(!route.request().url().includes('dsh-claude-style-maintained'))return route.continue()
    const response=await route.fetch(),body=await response.text()
    await route.fulfill({response,body:body.replace('function apply(ctx) {','function apply(ctx) {window.stopCtx=ctx;')})
   })
   await page.evaluate(value=>localStorage.setItem('dsh-claude-style.native-input',value),native?'on':'off')
   await page.reload();await waitForSkin(page);await dismissOverlays(page)
   await page.setViewportSize({width,height:900});await page.waitForTimeout(500)
  },
  async duringTurn({page,notes,out}){
   const stops=page.locator('[data-composer-card]:not([inert] *) button[data-dsh-claude-control="stop"]:visible:not([inert] *)')
   await stops.last().waitFor({state:'visible'});await page.waitForTimeout(650)
   const field=page.locator(native?'.dsh-claude-native-input:visible:not([inert] *)':'[data-composer-input]:visible:not([inert] *)')
   if(typing)await field.fill('保留这一段正在编辑的消息')
   await page.waitForTimeout(300)
   notes.wasRunning=await page.evaluate(()=>{const service=stopCtx.get('uiSession');return service.sessionStatus.getSnapshot().get(service.current.value.key)?.running===true})
   notes.stop=await stops.evaluateAll(elements=>elements.map(element=>{
    const r=element.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)
    const card=element.closest('[data-composer-card]'),scroll=card.querySelector('[data-input-scroll]'),input=scroll.getBoundingClientRect()
    return {box:[r.x,r.y,r.width,r.height],input:[input.x,input.y,input.right,input.bottom],hit:hit?.closest('button')?.getAttribute('data-dsh-claude-control'),disabled:element.disabled,container:getComputedStyle(card.querySelector('[data-dsh-claude-composer-toolbar]')).containerType}
   }))
   if(native&&width<=720&&typing){
    const audit=await createImportanceAudit(page)
    const rules=planImportance(audit.result().sheet).rules.filter(rule=>rule.selector.includes('data-dsh-claude-native-typing')).map(rule=>rule.id)
    await audit.state('phone stop beside an uncommitted draft',rules)
    notes.stopImportance=rules.length>0&&audit.result().declarations.filter(item=>rules.some(id=>item.key.startsWith(id+':'))).every(item=>item.verdict==='needed')
   }
   await sanitizePage(expression=>page.evaluate(expression));await page.screenshot({path:path.join(out,`stop-${width}-${native?'native':'official'}-${typing?'draft':'empty'}.png`)})
   await stops.last().click({timeout:5000})
   await page.waitForFunction(()=>{const service=stopCtx.get('uiSession');return service.sessionStatus.getSnapshot().get(service.current.value.key)?.running===false},undefined,{timeout:5000})
   notes.stopped=true
   notes.draft=typing?(native?await field.inputValue():await field.innerText()):''
  },
  async assert({notes,session}){
   const rows=notes.stop??[]
   return [
    check('暂停按钮在输入区域内，点击中心不被圆环或输入框遮挡',rows.length>0&&rows.every(row=>!row.disabled&&row.hit==='stop'&&row.box[0]>=row.input[0]-1&&row.box[0]+row.box[2]<=row.input[2]+1&&row.box[1]>=row.input[1]-1&&row.box[1]+row.box[3]<=row.input[3]+1),JSON.stringify(rows)),
    check('点击真实暂停按钮后任务停止',notes.wasRunning===true&&notes.stopped===true),
    check('暂停保留未发送的草稿',!typing||notes.draft.includes('保留这一段正在编辑的消息'),notes.draft),
    check('手机暂停的位置覆盖确有必要',!(native&&width<=720&&typing)||notes.stopImportance===true),
    check('控制台没有异常',session.problems.length===0,session.problems.slice(0,3).join(' | ')),
   ]
  },
 }
}
module.exports={stopControlScenarios:{
 stopDesktop:stopControlsScenario({native:false,width:1440,typing:false}),
 stopDesktopDraft:stopControlsScenario({native:false,width:1024,typing:true}),
 stopNativeDesktop:stopControlsScenario({native:true,width:1440,typing:false}),
 stopNativeDesktopDraft:stopControlsScenario({native:true,width:1024,typing:true}),
 stopPhone:stopControlsScenario({native:true,width:390,typing:false}),
 stopPhoneDraft:stopControlsScenario({native:true,width:360,typing:true}),
}}
