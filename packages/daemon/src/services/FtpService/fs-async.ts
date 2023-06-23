import fs from 'fs'
import { promisify } from 'util'

const stat = promisify(fs.stat)
const readdir = promisify(fs.readdir)
const access = promisify(fs.access)
const unlink = promisify(fs.unlink)
const rmdir = promisify(fs.rmdir)
const mkdir = promisify(fs.mkdir)
const rename = promisify(fs.rename)
const chmod = promisify(fs.chmod)

export { stat, readdir, access, unlink, rmdir, mkdir, rename, chmod }
