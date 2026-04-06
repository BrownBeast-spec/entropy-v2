import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeWorkflow } from './workflow';

describe('workflow API client', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should successfully execute workflow with valid request', async () => {
    const mockResponse = {
      queryId: 'query-123',
      addedNodesCount: 5,
      addedEdgesCount: 3,
      synthesis: {
        sections: [
          {
            title: 'Overview',
            content: 'Test content',
            citations: [
              {
                source: 'PubMed',
                label: 'Test Paper',
                nodeId: 'node-1',
              },
            ],
          },
        ],
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await executeWorkflow({
      workspaceId: 'workspace-123',
      queryText: 'What is metformin mechanism?',
      mode: 'Researcher',
      indiaLens: false,
      searchTypes: [],
      reportSections: [],
      searchResults: [
        {
          id: 'paper-1',
          title: 'Metformin study',
          type: 'paper',
          source: 'PubMed',
        },
      ],
    });

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/workflow/synthesize',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('workspace-123'),
      })
    );
  });

  it('should throw error when workflow execution fails', async () => {
    const errorResponse = {
      error: {
        code: 'WORKFLOW_ERROR',
        message: 'Workflow failed',
        details: {},
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => errorResponse,
    });

    await expect(
      executeWorkflow({
        workspaceId: 'workspace-123',
        queryText: 'Test',
        mode: 'Researcher',
        indiaLens: false,
        searchTypes: [],
        reportSections: [],
        searchResults: [],
      })
    ).rejects.toThrow('Workflow execution failed: Workflow failed');
  });

  it('should throw error when network request fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network error')
    );

    await expect(
      executeWorkflow({
        workspaceId: 'workspace-123',
        queryText: 'Test',
        mode: 'Researcher',
        indiaLens: false,
        searchTypes: [],
        reportSections: [],
        searchResults: [],
      })
    ).rejects.toThrow('Network error');
  });

  it('should pass through all request parameters correctly', async () => {
    const mockResponse = {
      queryId: 'query-123',
      addedNodesCount: 0,
      addedEdgesCount: 0,
      synthesis: { sections: [] },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await executeWorkflow({
      workspaceId: 'ws-456',
      queryText: 'Test query',
      mode: 'Strategist',
      indiaLens: true,
      searchTypes: ['compound', 'trial'],
      reportSections: ['Overview', 'Analysis'],
      searchResults: [{ id: '1', title: 'Paper 1', type: 'paper', source: 'PubMed' }],
    });

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody).toEqual({
      workspaceId: 'ws-456',
      queryText: 'Test query',
      mode: 'Strategist',
      indiaLens: true,
      searchTypes: ['compound', 'trial'],
      reportSections: ['Overview', 'Analysis'],
      performSearch: false,
      searchResults: [{ id: '1', title: 'Paper 1', type: 'paper', source: 'PubMed' }],
    });
  });
});
