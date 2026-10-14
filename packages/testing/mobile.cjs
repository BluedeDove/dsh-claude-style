'use strict'
const path = require('node:path')
const fs = require('node:fs')
const {check} = require('./lane.cjs')
const {sanitizePage} = require('../../scripts/shared/privacy.cjs')
const {createImportanceAudit, planImportance} = require('./importance.cjs')

async function layout(page) {
  return page.evaluate(() => {
    const box = selector => {const e=document.querySelector(selector); if(!e)return null; const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}}
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      field:box('.dsh-claude-native-input'),card:box('[data-composer-card]'),dock:box('[data-dsh-claude-mobile-dock]'),
      toolbar:box('[data-dsh-claude-mobile-toolbar]'),header:box('[data-dsh-claude-mobile-header-root]'),
      active:document.body.hasAttribute('data-dsh-claude-mobile')}
  })
}

const mobileScenario = {
  script: 'greeting', prompt: '手机中文输入验证', viewport: {width:390,height:844},
  async beforeSend({page}) {
    await page.waitForSelector('.dsh-claude-native-input:visible')
    await page.evaluate(() => {
      const field=document.querySelector('.dsh-claude-native-input'); window.__nativeChanges=0
      window.__nativeObserver=new MutationObserver(records=>window.__nativeChanges+=records.length)
      window.__nativeObserver.observe(field,{attributes:true,childList:true,subtree:true})
    })
  },
  async assert({page,session,out}) {
    const checks=[], sizes=[]
    const rows=await page.locator('[data-chat-flow-kind="user"]').allTextContents()
    checks.push(check('原生文本框完整发送中文，消息只出现一次',rows.length===1&&rows[0].includes('手机中文输入验证'),JSON.stringify(rows)))
    for (const width of [360,390,430]) {
      await page.setViewportSize({width,height:844}); await page.waitForTimeout(250)
      const state=await layout(page); sizes.push(state)
      checks.push(check(`${width} 像素输入框与统计不重叠，页面没有横向溢出`,
        state.active&&state.scrollWidth===width&&state.field?.left>=0&&state.field?.right<=width&&state.dock?.top>=state.field?.bottom,
        JSON.stringify(state)))
    }
    await page.setViewportSize({width:390,height:844})
    const audit=await createImportanceAudit(page)
    const importantRules=planImportance(audit.result().sheet).rules.filter(rule=>rule.selector.includes('data-dsh-claude-mobile')).map(rule=>rule.id)
    await audit.state('phone compact',importantRules)
    await page.getByRole('button',{name:'工具',exact:true}).click()
    await audit.state('phone tools',importantRules)
    checks.push(check('展开工具后仍能选择权限和输入法',await page.locator('[data-dsh-claude-mobile-secondary]:visible').count()>=2))
    await page.getByRole('button',{name:'更多',exact:true}).click()
    checks.push(check('展开顶栏后可进入原来的对话页签',await page.locator('[data-dsh-view-tabs]:visible').count()===1))
    await page.locator('[data-sidebar-right-expand]:visible').click()
    await page.waitForSelector('[data-sidebar-right-open]:visible')
    const rightbar=await page.locator('[data-sidebar-right-open]:visible').boundingBox()
    checks.push(check('原生文件与终端面板在手机上仍可展开',rightbar?.width>=300&&rightbar?.width<=390,JSON.stringify(rightbar)))
    await page.locator('[data-sidebar-right-toggle]:visible').click()
    await page.waitForSelector('[data-sidebar-right-open]',{state:'hidden'})
    await page.getByRole('button',{name:'更多',exact:true}).click()
    await page.getByRole('button',{name:'打开会话侧栏',exact:true}).click()
    await page.waitForFunction(()=>document.body.hasAttribute('data-dsh-claude-mobile-sidebar-open'))
    await page.waitForSelector('.dsh-claude-history-filter select:visible')
    await audit.state('phone sidebar',importantRules)
    const sidebar=await page.locator('[data-dsh-claude-mobile-sidebar]').boundingBox()
    checks.push(check('侧栏以抽屉展开且保留会话范围选择',sidebar?.width>=300&&await page.getByLabel('侧栏会话时间范围').isVisible()))
    await page.getByRole('button',{name:'关闭会话侧栏',exact:true}).click({position:{x:380,y:400}})
    await page.waitForFunction(()=>!document.body.hasAttribute('data-dsh-claude-mobile-sidebar-open'))
    const field=page.locator('.dsh-claude-native-input:visible')
    await field.focus(); await page.waitForTimeout(300)
    await page.evaluate(()=>{
      window.__nativeObserver.disconnect(); window.__nativeChanges=0; window.__nativeRecords=[]
      window.__nativeObserver=new MutationObserver(records=>{window.__nativeChanges+=records.length;window.__nativeRecords.push(...records.map(r=>({type:r.type,attribute:r.attributeName})))})
      window.__nativeObserver.observe(document.querySelector('.dsh-claude-native-input'),{attributes:true,childList:true,subtree:true})
    })
    await field.fill('输入法测试，保留未提交文字')
    await field.evaluate(element=>element.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})))
    await page.keyboard.insertText('语音追加内容')
    await field.evaluate(element=>element.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})))
    const held=await field.inputValue()
    checks.push(check('输入过程中原生字段没有属性或结构改写',await page.evaluate(()=>window.__nativeChanges)===0,JSON.stringify(await page.evaluate(()=>window.__nativeRecords))))
    checks.push(check('组合输入后文字与焦点保持完整',held==='输入法测试，保留未提交文字语音追加内容'&&await field.evaluate(e=>e===document.activeElement),held))
    await field.fill('')
    await field.fill('/')
    await page.waitForSelector('[role="listbox"]:visible')
    checks.push(check('命令字符仍打开宿主命令菜单',await page.locator('[role="listbox"]:visible').count()>0))
    await page.keyboard.press('Escape'); await field.fill(''); await field.blur()
    await field.fill('切换输入法保留文本')
    await page.getByRole('button',{name:'改用官方输入框',exact:true}).click()
    await page.waitForSelector('[data-composer-input]:visible')
    checks.push(check('退出原生输入后交还官方编辑器并保留草稿',
      await page.locator('.dsh-claude-native-wrap').getAttribute('hidden')!==null&&
      (await page.locator('[data-composer-input]').innerText()).includes('切换输入法保留文本')))
    await page.getByRole('button',{name:'开启原生输入框',exact:true}).click()
    await page.waitForSelector('.dsh-claude-native-input:visible')
    await field.fill(''); await field.blur()
    const file=path.join(out,'mobile-upload.txt'); fs.writeFileSync(file,'phone attachment test\n')
    await page.locator('[data-composer-card] input[type="file"]').setInputFiles(file)
    await page.waitForSelector('[data-composer-card][data-has-attachments="true"]')
    checks.push(check('附件仍通过宿主上传入口加入草稿',await page.locator('[data-composer-card][data-has-attachments="true"]').count()===1))
    await page.setViewportSize({width:390,height:520}); await page.waitForTimeout(300)
    const keyboard=await layout(page)
    checks.push(check('较短可视区域内输入框保持可操作',keyboard.field?.bottom<=520&&keyboard.field?.height>=44,JSON.stringify(keyboard)))
    await audit.state('phone keyboard',importantRules)
    const importance=audit.result()
    const redundant=importance.declarations.filter(row=>row.selector.includes('data-dsh-claude-mobile')&&row.verdict==='removable')
    fs.writeFileSync(path.join(out,'mobile-importance.json'),JSON.stringify(importance,null,2))
    checks.push(check('手机规则只保留实际需要的 !important',redundant.length===0,JSON.stringify(redundant)))
    await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(300)
    await sanitizePage(expression=>page.evaluate(expression))
    for (const scheme of ['light','dark']) {
      await page.evaluate(dark=>document.body.toggleAttribute('data-ds-dark-theme',dark),scheme==='dark')
      await page.screenshot({path:path.join(out,`mobile-${scheme}.png`)})
    }
    await page.setViewportSize({width:1280,height:900}); await page.waitForTimeout(300)
    checks.push(check('宽屏恢复桌面布局',!(await layout(page)).active&&await page.locator('.dsh-claude-mobile-menu').count()===0))
    checks.push(check('控制台没有异常',session.problems.length===0,session.problems.slice(0,3).join(' | ')))
    return checks
  },
}
module.exports={mobileScenario}
