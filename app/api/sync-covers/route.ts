import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Run the sync script
    const { stdout, stderr } = await execAsync('npm run sync-covers', {
      cwd: process.cwd(),
      timeout: 120000 // 2 minute timeout
    });

    // Parse the output to extract statistics
    const output = stdout + stderr;
    const downloadedMatch = output.match(/Downloaded:\s*(\d+)/);
    const skippedMatch = output.match(/Skipped.*?:\s*(\d+)/);
    const failedMatch = output.match(/Failed:\s*(\d+)/);

    return NextResponse.json({
      success: true,
      message: 'Cover sync completed successfully',
      stats: {
        downloaded: downloadedMatch ? parseInt(downloadedMatch[1]) : 0,
        skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0
      },
      output: output
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Sync failed',
      output: error.stdout || error.stderr || ''
    }, { status: 500 });
  }
}
