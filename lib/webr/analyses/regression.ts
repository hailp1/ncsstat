/**
 * Regression Analysis Modules
 */
import { initWebR, executeRWithRecovery } from '../core';
import { parseWebRResult, arrayToRMatrix } from '../utils';

/**
 * Run Multiple Linear Regression
 */
export async function runLinearRegression(data: number[][], names: string[]): Promise<{
    coefficients: {
        term: string;
        estimate: number;
        stdBeta: number;
        stdError: number;
        tValue: number;
        pValue: number;
        vif?: number;
    }[];
    modelFit: {
        rSquared: number;
        adjRSquared: number;
        fStatistic: number;
        df: number;
        dfResid: number;
        pValue: number;
        residualStdError: number;
        normalityP: number;
    };
    equation: string;
    chartData: {
        fitted: number[];
        residuals: number[];
        actual: number[];
    };
    rCode: string;
}> {
    const webR = await initWebR();

    const rCode = `
    data_mat <- ${arrayToRMatrix(data)}
    df <- as.data.frame(data_mat)
    colnames(df) <- c(${names.map(n => `"${n}"`).join(',')})
    
    y_name <- colnames(df)[1]
    f_str <- paste(sprintf("\`%s\`", y_name), "~ .")
    model <- lm(as.formula(f_str), data = df)
    s <- summary(model)
    coefs <- coef(s)
    fstat <- s$fstatistic
    
    f_val <- if (is.null(fstat)) 0 else fstat[1]
    df_num <- if (is.null(fstat)) 0 else fstat[2]
    df_denom <- if (is.null(fstat)) 0 else fstat[3]
    f_p_value <- if (is.null(fstat)) 1 else pf(f_val, df_num, df_denom, lower.tail = FALSE)

    vif_vals <- tryCatch({
        x_data <- df[, -1, drop = FALSE]
        if (ncol(x_data) > 1) {
            vifs <- numeric(ncol(x_data))
            for (i in 1:ncol(x_data)) {
                r2 <- summary(lm(x_data[, i] ~ ., data = x_data[, -i, drop = FALSE]))$r.squared
                vifs[i] <- if (r2 >= 0.9999) 999.99 else 1 / (1 - r2)
            }
            vifs
        } else { c(1.0) }
    }, error = function(e) numeric(0))

    normality_p <- tryCatch(shapiro.test(residuals(model))$p.value, error = function(e) 0)

    std_betas <- tryCatch({
        b <- coefs[-1, 1]
        x_data <- df[, -1, drop = FALSE]
        sx <- sapply(x_data, sd, na.rm = TRUE)
        sy <- sd(df[, 1], na.rm = TRUE)
        c(NA, b * sx / sy)
    }, error = function(e) rep(NA, nrow(coefs)))

    list(
        coef_names = rownames(coefs),
        estimates = coefs[, 1],
        std_betas = std_betas,
        std_errors = coefs[, 2],
        t_values = coefs[, 3],
        p_values = coefs[, 4],
        r_squared = s$r.squared,
        adj_r_squared = s$adj.r.squared,
        f_stat = f_val,
        df_num = df_num,
        df_denom = df_denom,
        f_p_value = f_p_value,
        sigma = s$sigma,
        fitted_values = fitted(model),
        residuals = residuals(model),
        actual_values = df[, 1],
        vifs = vif_vals,
        normality_p = normality_p
    )
    `;

    const result = await executeRWithRecovery(rCode);
    const jsResult = await result.toJs() as any;
    const getValue = parseWebRResult(jsResult);

    const coefNames = getValue('coef_names') || [];
    const estimates = getValue('estimates') || [];
    const stdBetas = getValue('std_betas') || [];
    const stdErrors = getValue('std_errors') || [];
    const tValues = getValue('t_values') || [];
    const pValues = getValue('p_values') || [];
    const vifs = getValue('vifs') || [];

    const coefficients = [];
    for (let i = 0; i < coefNames.length; i++) {
        coefficients.push({
            term: coefNames[i],
            estimate: estimates[i],
            stdBeta: stdBetas[i] || 0,
            stdError: stdErrors[i],
            tValue: tValues[i],
            pValue: pValues[i],
            vif: (coefNames[i] !== '(Intercept)') ? (vifs[(i - 1)] || undefined) : undefined
        });
    }

    let equationStr = `${(coefficients[0]?.estimate || 0).toFixed(3)} `;
    for (const coef of coefficients) {
        if (coef.term === '(Intercept)') continue;
        const sign = coef.estimate >= 0 ? ' + ' : ' - ';
        equationStr += `${sign}${Math.abs(coef.estimate).toFixed(3)}*${coef.term.replace(/`/g, '')}`;
    }

    return {
        coefficients,
        modelFit: {
            rSquared: getValue('r_squared')?.[0] || 0,
            adjRSquared: getValue('adj_r_squared')?.[0] || 0,
            fStatistic: getValue('f_stat')?.[0] || 0,
            df: getValue('df_num')?.[0] || 0,
            dfResid: getValue('df_denom')?.[0] || 0,
            pValue: getValue('f_p_value')?.[0] || 0,
            residualStdError: getValue('sigma')?.[0] || 0,
            normalityP: getValue('normality_p')?.[0] || 0
        },
        equation: equationStr,
        chartData: {
            fitted: getValue('fitted_values') || [],
            residuals: getValue('residuals') || [],
            actual: getValue('actual_values') || []
        },
        rCode
    };
}

/**
 * Run Logistic Regression (Binary)
 */
export async function runLogisticRegression(data: number[][], names: string[]): Promise<{
    coefficients: {
        term: string;
        estimate: number;
        stdError: number;
        zValue: number;
        pValue: number;
        oddsRatio: number;
        confLow: number;
        confHigh: number;
    }[];
    modelFit: {
        aic: number;
        nullDeviance: number;
        residDeviance: number;
        pseudoR2: number;
        accuracy: number;
    };
    confusionMatrix: {
        trueNegative: number;
        falsePositive: number;
        falseNegative: number;
        truePositive: number;
    };
    rCode: string;
}> {
    const webR = await initWebR();

    const rCode = `
    data_mat <- ${arrayToRMatrix(data)}
    df <- as.data.frame(data_mat)
    colnames(df) <- c(${names.map(n => `"${n}"`).join(',')})
    
    # Ensure DV is factor (0/1)
    y_name <- colnames(df)[1]
    df[[y_name]] <- as.factor(df[[y_name]])
    
    # Formula
    f_str <- paste(sprintf("\`%s\`", y_name), "~ .")
    
    # Run GLM (Binomial)
    model <- glm(as.formula(f_str), data = df, family = binomial(link = "logit"))
    s <- summary(model)
    coefs <- coef(s)
    
    # Odds Ratios & CI
    ors <- exp(coef(model))
    ci <- tryCatch(exp(confint(model)), error = function(e) matrix(NA, nrow=length(ors), ncol=2))
    
    # Model Fit
    null_dev <- model$null.deviance
    resid_dev <- model$deviance
    pseudo_r2 <- 1 - (resid_dev / null_dev)
    
    # Confusion Matrix (Threshold 0.5)
    probs <- predict(model, type = "response")
    preds <- ifelse(probs > 0.5, 1, 0)
    actual <- as.numeric(as.character(df[[y_name]]))
    
    tbl <- table(factor(preds, levels=c(0,1)), factor(actual, levels=c(0,1)))
    
    list(
        coef_names = rownames(coefs),
        estimates = coefs[, 1],
        std_errors = coefs[, 2],
        z_values = coefs[, 3],
        p_values = coefs[, 4],
        odds_ratios = ors,
        conf_low = if(all(is.na(ci))) rep(NA, length(ors)) else ci[,1],
        conf_high = if(all(is.na(ci))) rep(NA, length(ors)) else ci[,2],
        
        aic = model$aic,
        null_dev = null_dev,
        resid_dev = resid_dev,
        pseudo_r2 = pseudo_r2,
        
        tn = tbl[1,1],
        fp = tbl[2,1],
        fn = tbl[1,2],
        tp = tbl[2,2]
    )
    `;

    const result = await executeRWithRecovery(rCode);
    const jsResult = await result.toJs() as any;
    const getValue = parseWebRResult(jsResult);

    const coefNames = getValue('coef_names') || [];
    const estimates = getValue('estimates') || [];
    const stdErrors = getValue('std_errors') || [];
    const zValues = getValue('z_values') || [];
    const pValues = getValue('p_values') || [];
    const ors = getValue('odds_ratios') || [];
    const low = getValue('conf_low') || [];
    const high = getValue('conf_high') || [];

    const coefficients = [];
    for (let i = 0; i < coefNames.length; i++) {
        coefficients.push({
            term: coefNames[i],
            estimate: estimates[i],
            stdError: stdErrors[i],
            zValue: zValues[i],
            pValue: pValues[i],
            oddsRatio: ors[i],
            confLow: low[i] || 0,
            confHigh: high[i] || 0
        });
    }

    const tn = getValue('tn')?.[0] || 0;
    const fp = getValue('fp')?.[0] || 0;
    const fn = getValue('fn')?.[0] || 0;
    const tp = getValue('tp')?.[0] || 0;
    const total = tn + fp + fn + tp;

    return {
        coefficients,
        modelFit: {
            aic: getValue('aic')?.[0] || 0,
            nullDeviance: getValue('null_dev')?.[0] || 0,
            residDeviance: getValue('resid_dev')?.[0] || 0,
            pseudoR2: getValue('pseudo_r2')?.[0] || 0,
            accuracy: total > 0 ? (tp + tn) / total : 0
        },
        confusionMatrix: {
            trueNegative: tn,
            falsePositive: fp,
            falseNegative: fn,
            truePositive: tp
        },
        rCode
    };
}
