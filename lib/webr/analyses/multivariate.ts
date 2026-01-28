/**
 * Multivariate Analysis Modules
 * Includes: Cluster Analysis, Two-Way ANOVA, MANOVA, etc.
 */
import { initWebR, executeRWithRecovery } from '../core';
import { parseWebRResult, arrayToRMatrix } from '../utils';

/**
 * Run Cluster Analysis (K-Means)
 */
export async function runClusterAnalysis(
    data: number[][],
    k: number = 3,
    method: string = 'kmeans',
    columns: string[] = []
): Promise<{
    clusters: number[];
    centers: number[][];
    size: number[];
    withinSS: number[];
    totWithinSS: number;
    betweensSS: number;
    totalSS: number;
    silhoutteScore?: number; // Optional, expensive to calc
    rCode: string;
}> {
    const webR = await initWebR();

    const rCode = `
    library(cluster)
    
    data_mat <- ${arrayToRMatrix(data)}
    df <- as.data.frame(data_mat)
    colnames(df) <- c(${columns.map(c => `"${c}"`).join(',')})
    
    # Scale Data (Important for K-Means)
    df_scaled <- scale(df)
    
    set.seed(123) # Reproducibility
    
    # Run K-Means
    km_res <- kmeans(df_scaled, centers = ${k}, nstart = 25)
    
    # Calculate Silhouette (optional, for quality)
    # silhouette_score <- NA
    # if(${data.length} < 2000) { # Only run for smaller datasets to save time
    #    sil <- silhouette(km_res$cluster, dist(df_scaled))
    #    silhouette_score <- mean(sil[,3])
    # }
    
    list(
        cluster = km_res$cluster,
        centers = as.numeric(t(km_res$centers)), # Flatten for transport
        cols = ncol(km_res$centers),
        size = km_res$size,
        withinss = km_res$withinss,
        tot_withinss = km_res$tot.withinss,
        betweenss = km_res$betweenss,
        totss = km_res$totss
    )
    `;

    const result = await executeRWithRecovery(rCode);
    const jsResult = await result.toJs() as any;
    const getValue = parseWebRResult(jsResult);

    const centersFlat = getValue('centers') || [];
    const nCols = getValue('cols')?.[0] || columns.length;

    // Reconstruct centers matrix
    const centers = [];
    for (let i = 0; i < k; i++) {
        centers.push(centersFlat.slice(i * nCols, (i + 1) * nCols));
    }

    return {
        clusters: getValue('cluster') || [],
        centers: centers,
        size: getValue('size') || [],
        withinSS: getValue('withinss') || [],
        totWithinSS: getValue('tot_withinss')?.[0] || 0,
        betweensSS: getValue('betweenss')?.[0] || 0,
        totalSS: getValue('totss')?.[0] || 0,
        rCode
    };
}

/**
 * Run Two-Way ANOVA
 * Supports interaction effects.
 */
export async function runTwoWayANOVA(
    y: number[],
    f1: string[],
    f2: string[],
    f1Name: string,
    f2Name: string,
    yName: string
): Promise<{
    anovaTable: {
        term: string;
        df: number;
        sumSq: number;
        meanSq: number;
        F: number;
        pValue: number;
    }[];
    interactionPlot: {
        f1Level: string;
        f2Level: string;
        mean: number;
    }[];
    rCode: string;
}> {
    // Validate inputs
    if (y.length === 0 || f1.length === 0 || f2.length === 0) {
        throw new Error('Dữ liệu trống. Vui lòng kiểm tra lại các biến đã chọn.');
    }
    if (y.length !== f1.length || y.length !== f2.length) {
        throw new Error('Độ dài các biến không khớp nhau.');
    }

    // Sanitize factor values (remove quotes and special characters)
    const sanitize = (s: string) => String(s).replace(/[\"\'\\]/g, '').replace(/\s+/g, '_').trim() || 'NA';
    const f1Clean = f1.map(sanitize);
    const f2Clean = f2.map(sanitize);

    // Check for valid numeric Y values
    const yValid = y.filter(v => !isNaN(v) && isFinite(v));
    if (yValid.length < 3) {
        throw new Error('Cần ít nhất 3 giá trị số hợp lệ cho biến phụ thuộc (Y).');
    }

    console.log('[Two-Way ANOVA] Running with:', {
        yLength: y.length,
        f1Levels: [...new Set(f1Clean)].length,
        f2Levels: [...new Set(f2Clean)].length
    });

    const rCode = `
    y <- c(${y.join(',')})
    f1 <- factor(c(${f1Clean.map(v => `"${v}"`).join(',')}))
    f2 <- factor(c(${f2Clean.map(v => `"${v}"`).join(',')}))
    
    df <- data.frame(y=y, f1=f1, f2=f2)
    colnames(df) <- c("y", "f1", "f2")
    
    # Run Two-Way ANOVA with Interaction
    # Note: 'aov' in R uses Type I SS by default. 
    # For unbalanced designs, Type III is better (requires 'car' package), 
    # but 'aov' is standard for base R. We'll stick to base 'aov' for speed/compatibility.
    
    model <- aov(y ~ f1 * f2, data = df)
    res <- summary(model)[[1]]
    
    # Interaction Means for Plotting
    int_means <- aggregate(y ~ f1 + f2, data = df, mean)
    
    list(
        terms = trimws(rownames(res)),
        df = res[,"Df"],
        sum_sq = res[,"Sum Sq"],
        mean_sq = res[,"Mean Sq"],
        f_val = res[,"F value"],
        p_val = res[,"Pr(>F)"],
        
        # Interaction Plot Data
        int_f1 = as.character(int_means$f1),
        int_f2 = as.character(int_means$f2),
        int_y = int_means$y
    )
    `;


    const result = await executeRWithRecovery(rCode);
    const jsResult = await result.toJs() as any;
    const getValue = parseWebRResult(jsResult);

    const terms = getValue('terms') || [];
    const dfs = getValue('df') || [];
    const sumSqs = getValue('sum_sq') || [];
    const meanSqs = getValue('mean_sq') || [];
    const fVals = getValue('f_val') || [];
    const pVals = getValue('p_val') || [];

    const anovaTable = [];
    for (let i = 0; i < terms.length; i++) {
        // Skip NA rows (residuals usually have NA for F and P)
        anovaTable.push({
            term: terms[i].replace('f1', f1Name).replace('f2', f2Name),
            df: dfs[i],
            sumSq: sumSqs[i],
            meanSq: meanSqs[i],
            F: fVals[i] || 0,
            pValue: pVals[i] || 0 // Residuals pValue usually undefined
        });
    }

    const intF1 = getValue('int_f1') || [];
    const intF2 = getValue('int_f2') || [];
    const intY = getValue('int_y') || [];
    const interactionPlot = intF1.map((v: string, i: number) => ({
        f1Level: v,
        f2Level: intF2[i],
        mean: intY[i]
    }));

    return { anovaTable, interactionPlot, rCode };
}
