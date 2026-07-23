# 平时开发：就在 custom/develop 上提交即可
# 上游发新版（如 v1.28.0）时升级 custom/develop：

git fetch upstream --tags
git rebase --onto v1.28.0 v1.27.1 custom/develop  # 把改动整体搬到新版本上

# 推送备份：
git push -u origin custom/develop
