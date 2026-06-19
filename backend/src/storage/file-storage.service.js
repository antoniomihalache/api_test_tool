import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

export class FileStorageService {
  async ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
  }

  async writeFile(dir, filename, content) {
    await this.ensureDir(dir);
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  async readFile(filePath) {
    return fs.readFile(filePath, 'utf8');
  }

  async deleteFile(filePath) {
    await fs.unlink(filePath);
  }

  async listFiles(dir) {
    const files = await fs.readdir(dir);
    return files;
  }

  async saveK6Script(executionId, script) {
    const filename = `k6-${executionId}.js`;
    return this.writeFile(config.K6_SCRIPTS_PATH, filename, script);
  }

  async saveReport(executionId, reportData) {
    const filename = `report-${executionId}.json`;
    return this.writeFile(config.REPORTS_PATH, filename, JSON.stringify(reportData, null, 2));
  }

  async getReportPath(executionId) {
    return path.join(config.REPORTS_PATH, `report-${executionId}.json`);
  }
}
