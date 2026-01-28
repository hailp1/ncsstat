import { initWebR } from '../core';
import { parseWebRResult } from '../utils';

export interface SEMResult {
    fitMeasures: {
        cfi: number;
        tli: number;
        rmsea: number;
        srmr: number;
        chisq: number;
        df: number;
        pvalue: number;
    };
    estimates: any[];
    rCode: string;
    warning?: string;
    error?: string;
}

/**
 * Run a true CFA or SEM using lavaan
 * @param data Numeric data matrix
 * @param columns Column names corresponding to the matrix
 * @param model Lavaan model string (e.g. 'F1 =~ v1 + v2 + v3 \n F2 =~ v4 + v5 + v6')
 */
export async function runLavaanAnalysis(data: number[][], columns: string[], model: string): Promise<SEMResult> {
    const webR = await initWebR();

    // Convert data to R Matrix/Dataframe 
    const flatData = data.flat();
    const rModel = model.replace(/\n/g, '\\n');

    const script = `
    # Create data frame
    df_sem <- data.frame(matrix(c(${flatData.join(',')}), ncol=${columns.length}, byrow=TRUE))
    colnames(df_sem) <- ${JSON.stringify(columns)}
    
    # Execute lavaan
    # We use 'sem' as a general function, which covers 'cfa' 
    # but handles regressions/path analysis too.
    
    fit <- tryCatch({
        library(lavaan)
        sem(model = "${rModel}", data = df_sem, std.lv = TRUE)
    }, error = function(e) {
        # Fallback for common errors
        stop(paste("Lavaan Error:", e$message))
    })
    
    # Extract fit measures
    fit_summ <- fitMeasures(fit)
    
    # Extract estimates
    est_df <- parameterEstimates(fit, standardized = TRUE)
    
    # Handle output mapping
    list(
        fit = list(
            cfi = as.numeric(fit_summ["cfi"]),
            tli = as.numeric(fit_summ["tli"]),
            rmsea = as.numeric(fit_summ["rmsea"]),
            srmr = as.numeric(fit_summ["srmr"]),
            chisq = as.numeric(fit_summ["chisq"]),
            df = as.numeric(fit_summ["df"]),
            pvalue = as.numeric(fit_summ["pvalue"])
        ),
        estimates = split(est_df, seq(nrow(est_df)))
    )
    `;

    try {
        const result = await webR.evalR(script);
        const jsResult = await result.toJs() as any;
        const getValue = parseWebRResult(jsResult);

        const fit = getValue('fit');
        const estimatesRaw = getValue('estimates');

        const fitMeasures = {
            cfi: fit?.cfi?.[0] || 0,
            tli: fit?.tli?.[0] || 0,
            rmsea: fit?.rmsea?.[0] || 0,
            srmr: fit?.srmr?.[0] || 0,
            chisq: fit?.chisq?.[0] || 0,
            df: fit?.df?.[0] || 0,
            pvalue: fit?.pvalue?.[0] || 0
        };

        const estimates: any[] = [];
        if (Array.isArray(estimatesRaw)) {
            for (const item of estimatesRaw) {
                const estValues = parseWebRResult(item);
                estimates.push({
                    lhs: estValues('lhs')?.[0] || '',
                    op: estValues('op')?.[0] || '',
                    rhs: estValues('rhs')?.[0] || '',
                    est: estValues('est')?.[0] || 0,
                    se: estValues('se')?.[0] || 0,
                    z: estValues('z')?.[0] || 0,
                    pvalue: estValues('pvalue')?.[0] || 0,
                    std: estValues('std.all')?.[0] || 0 // standardized estimate
                });
            }
        }

        return {
            fitMeasures,
            estimates,
            rCode: script
        };

    } catch (e: any) {
        console.error('Lavaan Execution Error:', e);
        return {
            fitMeasures: { cfi: 0, tli: 0, rmsea: 0, srmr: 0, chisq: 0, df: 0, pvalue: 0 },
            estimates: [],
            rCode: script,
            error: e.message || String(e)
        };
    }
}

/**
 * Backward compatibility alias for runSEM in upcoming.ts
 */
export const runSEM = runLavaanAnalysis;
