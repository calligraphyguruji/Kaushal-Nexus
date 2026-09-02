import { apiClient } from './client';

export const tasksApi = {
  /**
   * Dispatches Celery background task for longitudinal impact report generation
   */
  async triggerReportGeneration({ district_id, quarter = '2026-Q1', report_format = 'PDF' } = {}) {
    const res = await apiClient.post('/api/v1/tasks/generate-report', {
      district_id,
      quarter,
      report_format,
    });
    return res.data;
  },

  /**
   * Retrieves live task execution progress and result from Redis/Celery backend
   */
  async getTaskStatus(taskId) {
    const res = await apiClient.get(`/api/v1/tasks/${encodeURIComponent(taskId)}`);
    return res.data;
  },

  /**
   * Downloads the generated artifact as a binary blob and triggers browser download
   */
  async downloadArtifact(reportId, fallbackFilename = null) {
    const res = await apiClient.get(`/api/v1/tasks/reports/download/${encodeURIComponent(reportId)}`, {
      responseType: 'blob',
    });

    const disposition = res.headers['content-disposition'] || '';
    let filename = fallbackFilename;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    if (!filename) {
      filename = `KaushalNexus_Report_${reportId}.pdf`;
    }

    const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);

    return true;
  },

  /**
   * End-to-end task workflow: Trigger -> Poll Progress -> Download Generated File
   */
  async generateAndDownloadReport({ district_id, quarter = '2026-Q1', report_format = 'PDF', onProgress = null } = {}) {
    // 1. Trigger Task
    const triggerRes = await this.triggerReportGeneration({ district_id, quarter, report_format });
    const taskId = triggerRes.task_id;

    if (onProgress) onProgress({ stage: 'Task Queued', progress: 10 });

    // 2. Poll until completion or timeout (max 30 seconds)
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const statusRes = await this.getTaskStatus(taskId);

      if (onProgress) {
        onProgress({
          stage: statusRes.stage || 'Processing',
          progress: statusRes.progress || 50,
          status: statusRes.status,
        });
      }

      if (statusRes.status === 'COMPLETED' || statusRes.status === 'SUCCESS') {
        const reportId = statusRes.result?.report_id || statusRes.details?.report_id || `RPT-${taskId.slice(0, 8).toUpperCase()}`;
        await this.downloadArtifact(reportId, statusRes.result?.file_name);
        return { success: true, taskId, reportId, result: statusRes.result };
      }

      if (statusRes.status === 'FAILED' || statusRes.status === 'FAILURE') {
        throw new Error(statusRes.details?.error || 'Report generation worker failed');
      }
    }

    throw new Error('Report generation timed out after 30 seconds.');
  },
};
