/**
 * Descriptive Statistics & Validation Modules
 */
import { initWebR, executeRWithRecovery } from '../core';
import { parseWebRResult, arrayToRMatrix } from '../utils';

/**
 * Data Validation Helper
 */
export function validateData(data: number[][], minVars: number = 1, functionName: string = 'Analysis'): void {
    if (!data || data.length === 0) {
        throw new Error(`${functionName}: Dữ liệu trống`);
    }

    if (data[0].length < minVars) {
        throw new Error(`${functionName}: Cần ít nhất ${minVars} biến`);
    }

    // Check for invalid values (NaN, Infinity)
    const hasInvalid = data.some(row =>
        row.some(val => !isFinite(val))
    );

    if (hasInvalid) {
        throw new Error(`${functionName}: Dữ liệu chứa giá trị không hợp lệ(NaN hoặc Infinity)`);
    }

    // Check for constant columns (zero variance)
    for (let col = 0; col < data[0].length; col++) {
        const values = data.map(row => row[col]);
        const allSame = values.every(v => v === values[0]);
        if (allSame) {
            throw new Error(`${functionName}: Biến thứ ${col + 1} có giá trị không đổi(variance = 0)`);
        }
    }
}

/**
 * Run descriptive statistics
 */
export async function runDescriptiveStats(data: number[][]): Promise<{
    mean: number[];
    sd: number[];
    min: number[];
    max: number[];
    median: number[];
    N: number[]; // Valid N per variable
    skew: number[];
    kurtosis: number[];
    se: number[];
}> {
    const webR = await initWebR();

    const rCode = `
    library(psych)
    data_mat <- ${arrayToRMatrix(data)}
    df <- as.data.frame(data_mat)
    colnames(df) <- paste0("V", 1:ncol(df))
    
    desc <- describe(df)
    
    list(
        mean = desc$mean,
        sd = desc$sd,
        min = desc$min,
        max = desc$max,
        median = desc$median,
        n = desc$n,
        skew = desc$skew,
        kurtosis = desc$kurtosis,
        se = desc$se
    )
    `;

    const result = await executeRWithRecovery(rCode);
    const jsResult = await result.toJs() as any;
    const getValue = parseWebRResult(jsResult);

    return {
        mean: getValue('mean') || [],
        sd: getValue('sd') || [],
        min: getValue('min') || [],
        max: getValue('max') || [],
        median: getValue('median') || [],
        N: getValue('n') || [],
        skew: getValue('skew') || [],
        kurtosis: getValue('kurtosis') || [],
        se: getValue('se') || []
    };
}
