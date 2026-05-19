import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = (file) => readFileSync(resolve(root, file), 'utf8')

const babySource = read('pages/baby/index.vue')
const pagesJson = JSON.parse(read('pages.json'))

assert.match(babySource, /async refreshBabyList\(\)[\s\S]*fetchBabyList\(\)/)
assert.doesNotMatch(babySource, /async loadBabies\(\)/)
assert.doesNotMatch(babySource, /@click="loadBabies"/)
assert.match(babySource, /@click="refreshBabyList"/)

assert.match(babySource, /async onShow\(\)[\s\S]*await this\.refreshBabyList\(\)/)
assert.match(babySource, /this\.currentBabyId = getCurrentBabyId\(\)/)

assert.match(babySource, /async onPullDownRefresh\(\)[\s\S]*await this\.refreshBabyList\(\)[\s\S]*uni\.stopPullDownRefresh\(\)/)
const babyPage = pagesJson.pages.find(item => item.path === 'pages/baby/index')
assert.equal(babyPage.style.enablePullDownRefresh, true)

assert.match(babySource, /babyListRequestSeq: 0/)
assert.match(babySource, /requestSeq !== this\.babyListRequestSeq/)
assert.match(babySource, /this\.babies = buildBabyViewModels\(this\.babies, this\.currentBabyId\)/)
assert.match(babySource, /const hasCurrentBaby = babies\.some\(baby => String\(baby\.babyId\) === String\(this\.currentBabyId\)\)/)
assert.match(babySource, /setCurrentBabyId\(this\.currentBabyId\)/)
assert.match(babySource, /clearCurrentBabyId\(\)/)

const catchStart = babySource.indexOf('} catch (error) {')
const catchEnd = babySource.indexOf('} finally {', catchStart)
const catchBody = babySource.slice(catchStart, catchEnd)
assert.doesNotMatch(catchBody, /this\.babies = \[\]/)

assert.match(babySource, /selectBaby\(baby\)[\s\S]*this\.currentBabyId = baby\.babyId[\s\S]*this\.babies = buildBabyViewModels\(this\.babies, this\.currentBabyId\)[\s\S]*setCurrentBabyId\(baby\.babyId\)/)

console.log('baby list refresh regression tests passed')
