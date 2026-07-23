# 平时开发：就在 my-custom 上提交即可
# 上游发新版（如 v1.28.0）时升级 my-custom：

git fetch upstream --tags
git rebase --onto v1.28.0 v1.27.1 my-custom  # 把改动整体搬到新版本上
