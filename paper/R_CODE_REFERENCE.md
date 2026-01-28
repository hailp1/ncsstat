# ncsStat R Code Documentation

Tài liệu này liệt kê tất cả các lệnh R được sử dụng trong ncsStat để phân tích thống kê.
Mỗi phần bao gồm: mô tả phương pháp, R packages cần thiết, và code tương đương với implementation thực tế.

---

## 📦 R Packages Sử Dụng

```r
library(psych)        # Correlation, Alpha, EFA, CFA, Mediation, Descriptive
library(cluster)      # Cluster Analysis
library(GPArotation)  # Factor rotation methods
```

---

## 1. Cronbach's Alpha (Độ tin cậy)

**Function:** `runCronbachAlpha()`

**Mục đích:** Đánh giá độ tin cậy nội tại của thang đo Likert hoặc biến liên tục.

**R Code:**
```r
library(psych)

# DATA CLEANING: Clamp outliers to valid Likert range
data <- pmax(pmin(raw_data, valid_max), valid_min)

# Run Cronbach's Alpha with auto key checking
result <- alpha(data, check.keys = TRUE)

# Extract statistics
# result$total$raw_alpha: Raw Cronbach's Alpha
# result$total$std.alpha: Standardized Alpha
# result$alpha.drop: Item-total statistics (if item deleted)
```

**Note:** Hệ thống tự động tính **McDonald's Omega** kèm theo (xem Mục 16).

---

## 2. Correlation Analysis (Tương quan)

**Function:** `runCorrelation()`

**Mục đích:** Tính ma trận tương quan (Pearson, Spearman, Kendall).

**R Code:**
```r
library(psych)

# method = "pearson" | "spearman" | "kendall"
ct <- corr.test(df, use = "pairwise", method = "pearson", adjust = "none")

# ct$r: Correlation Matrix
# ct$p: P-values Matrix
```

---

## 3. Descriptive Statistics (Thống kê mô tả)

**Function:** `runDescriptiveStats()`

**Mục đích:** Tính Mean, SD, Skewness, Kurtosis.

**R Code:**
```r
library(psych)
desc <- describe(df)
# Returns: mean, sd, min, max, skew, kurtosis, se
```

---

## 4. Independent T-Test (So sánh 2 nhóm độc lập)

**Function:** `runTTestIndependent()`

**Mục đích:** So sánh trung bình 2 nhóm độc lập.

**R Code:**
```r
# 1. Normality Check (Shapiro-Wilk)
shapiro_p1 <- shapiro.test(group1)$p.value
shapiro_p2 <- shapiro.test(group2)$p.value

# 2. Homogeneity of Variance (Levene/Brown-Forsythe)
# Using oneway.test logic manually or car::leveneTest
# ncsStat uses Brown-Forsythe logic (median-based) internally via oneway.test on deviations
med1 <- median(group1); med2 <- median(group2)
z <- c(abs(group1 - med1), abs(group2 - med2))
g <- factor(c(rep(1,length(group1)), rep(2,length(group2))))
levene_p <- oneway.test(z ~ g, var.equal=TRUE)$p.value

# 3. T-Test (Auto-switch based on Levene)
var_equal <- levene_p > 0.05
test <- t.test(group1, group2, var.equal = var_equal)

# 4. Effect Size (Cohen's d)
pooled_sd <- sqrt(((n1-1)*sd1^2 + (n2-1)*sd2^2)/(n1+n2-2))
d <- (mean1 - mean2) / pooled_sd
```

---

## 5. Paired T-Test (So sánh cặp)

**Function:** `runTTestPaired()`

**Mục đích:** So sánh trước-sau hoặc cặp đôi.

**R Code:**
```r
# Normality of DIFFERENCES
diffs <- before - after
shapiro_p <- shapiro.test(diffs)$p.value

# T-Test
test <- t.test(before, after, paired = TRUE)

# Effect Size (Cohen's d for paired)
d <- mean(diffs) / sd(diffs)
```

---

## 6. One-Way ANOVA & Welch ANOVA

**Function:** `runOneWayANOVA()`

**Mục đích:** So sánh trung bình 3+ nhóm.

**R Code:**
```r
# 1. Levene's Test (Brown-Forsythe)
# ... see logic in #4 ...

if (levene_p > 0.05) {
    # Equal Variance -> Classic ANOVA + Tukey HSD
    model <- aov(values ~ groups)
    summary(model)
    TukeyHSD(model)
} else {
    # Unequal Variance -> Welch ANOVA + Games-Howell
    oneway.test(values ~ groups, var.equal = FALSE)
    # Games-Howell post-hoc implemented manually in ncsStat
}
```

---

## 7. Exploratory Factor Analysis (EFA)

**Function:** `runEFA()`

**Mục đích:** Khám phá cấu trúc nhân tố.

**R Code:**
```r
library(psych)

# 1. Parallel Analysis (Gold standard for n_factors)
pa <- fa.parallel(df, fm="pa", fa="fa", n.iter=20, plot=FALSE)
n_factors <- pa$nfact

# 2. Run EFA (Principal Axis Factoring + Varimax/Promax)
fit <- fa(df, nfactors=n_factors, rotate="varimax", fm="pa")

# fit$loadings, fit$communalities, fit$Structure
```

---

## 8. Confirmatory Factor Analysis (CFA Proxy)

**Function:** `runCFA()`

**Mục đích:** Mô phỏng CFA bằng EFA với fixed loading (tạm thời, chưa phải SEM-CFA).

**R Code:**
```r
library(psych)
# Proxy CFA using fa() with ML estimation and specific factor number
fit <- fa(df, nfactors=k, rotate="oblimin", fm="ml")
# Use fit statistics (RMSEA, TLI, CFI) from fa output
```

---

## 9. Multiple Linear Regression

**Function:** `runLinearRegression()`

**Mục đích:** Hồi quy tuyến tính.

**R Code:**
```r
model <- lm(y ~ ., data=df)
summary(model)

# VIF (Variance Inflation Factor)
# ncsStat calculates VIF manually: 1 / (1 - R_squared_i) for each predictor
```

---

## 10. Mann-Whitney U Test

**Function:** `runMannWhitneyU()`

**Mục đích:** So sánh 2 nhóm (phi tham số).

**R Code:**
```r
# Wilcoxon Rank Sum Test
test <- wilcox.test(g1, g2, conf.int=TRUE)

# Effect Size (r)
r <- abs(qnorm(test$p.value/2)) / sqrt(n1+n2)

# Check Distribution Shape (Skewness)
library(psych)
skew1 <- skew(g1); skew2 <- skew(g2)
# If sign(skew1) == sign(skew2) & abs(diff) < 1 -> Similar shape -> Compare Medians
```

---

## 11. Chi-Square Test

**Function:** `runChiSquare()`

**Mục đích:** Kiểm định độc lập cho biến định danh.

**R Code:**
```r
tbl <- table(var1, var2)
test <- chisq.test(tbl)

# Effect Size (Cramer's V)
n <- sum(tbl)
V <- sqrt(test$statistic / (n * (min(dim(tbl)) - 1)))

# 2x2 Specifics
if(nrow==2 && ncol==2) {
    fisher.test(tbl)$estimate # Odds Ratio
    phi <- sqrt(test$statistic / n)
}
```

---

## 12. Logistic Regression

**Function:** `runLogisticRegression()`

**Mục đích:** Hồi quy nhị phân (Binary Outcome).

**R Code:**
```r
# Family = Binomial (Logit)
model <- glm(y ~ ., data=df, family=binomial(link="logit"))

# Odds Ratios
exp(coef(model))

# McFadden's Pseudo R2
1 - (model$deviance / model$null.deviance)
```

---

## 13. Cluster Analysis (K-Means)

**Function:** `runClusterAnalysis()`

**Mục đích:** Phân cụm dữ liệu.

**R Code:**
```r
library(cluster)

# Scale data first!
df_scaled <- scale(df)

# K-Means
set.seed(123)
km <- kmeans(df_scaled, centers=k, nstart=25)

# Metrics
km$tot.withinss # Total Within SS
km$betweenss    # Between SS
```

---

## 14. Mediation Analysis

**Function:** `runMediationAnalysis()`

**Mục đích:** Phân tích trung gian (X -> M -> Y).

**R Code:**
```r
library(psych)

# Uses psych::mediate for robust bootstrapping
# Model: Y ~ X + (M)
model <- mediate(y ~ x + (m), data=df, n.iter=1000, plot=FALSE)

# Effects
model$total    # Total Effect (c)
model$direct   # Direct Effect (c')
model$indirect # Indirect Effect (ab)
model$boot     # Bootstrapped CI for indirect effect
```

---

## 15. Moderation Analysis

**Function:** `runModerationAnalysis()`

**Mục đích:** Phân tích điều tiết (Interaction Effect).

**R Code:**
```r
# Manual centering and interaction
x_c <- scale(x, scale=FALSE)
m_c <- scale(m, scale=FALSE)
model <- lm(y ~ x_c * m_c) # Includes x_c, m_c, and x_c:m_c

# Simple Slopes (at Mean, -1SD, +1SD)
# Calculated by checking slope of X at different levels of M
```

---

## 16. McDonald's Omega

**Function:** Part of `runCronbachAlpha()`

**Mục đích:** Độ tin cậy tổng hợp (tốt hơn Alpha).

**R Code:**
```r
library(psych)
omega(df, nfactors=1)
```

---

## 17. Two-Way ANOVA

**Function:** `runTwoWayANOVA()`

**Mục đích:** ANOVA 2 yếu tố với tương tác.

**R Code:**
```r
# Model with Interaction
model <- aov(y ~ f1 * f2, data=df)
summary(model)

# Interaction Means for Plotting
aggregate(y ~ f1 + f2, data=df, mean)
```
