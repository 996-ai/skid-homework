# 打滑作业平台

[ENGLISH README](/README-EN.md)

> 学生们的兴趣 & 日常生活 很重要

开源 AI 家庭作业解答器, 为自学者节省时间的学习平台

## 为什么用 打滑作业

如果你觉得这个工具好用, 可以点一个Star 或者分享给你的朋友!

- 节省时间
- 无需遥测
- 开源，无黑盒
- 无垃圾电话
- 无需电话号码
- 可通过电脑、平板电脑或手机访问
- 人体工程学设计, 支持纯键盘操作
- 可定制答案风格, 不局限于标准答案
- 支持解析多张图片/PDF 文件

## 现在尝试

官方实例部署在 [https://skid.996every.day](https://skid.996every.day)

您需要申请一个 Gemini API 密钥才能访问 AI。

[Google AI Studio](https://aistudio.google.com/api-keys)

### 赞助

您的支持是我们持续创作和维护的动力。我是个人开发者/学生, 收入很少, 感谢您的慷慨解囊！ 赞助后我们将会将您的GitHub用户名加入项目README 以感谢! (可选, 如果我忘记了请开issue提醒我)

我们开发的程序保证永远免费开源, 如果我们开发的程序为您节省了时间, 请考虑捐赠我们!

[现在赞助](https://996every.day/donate)

## 快捷键说明

| 快捷键     | 说明                    |
| ---------- | ----------------------- |
| Ctrl+1     | 上传文件                |
| Ctrl+2     | 拍照                    |
| Ctrl+3     | 将文件提交给AI          |
| Ctrl+4     | 删除所有文件            |
| Ctrl+5     | 打开设置页面            |
| ESC        | 关闭设置页面/当前对话框 |
| 空格       | 下一个题目              |
| Shift+空格 | 上一个题目              |
| Tab        | 下一个文件              |
| Shift+Tab  | 上一个文件              |
| /          | 改进答案                |

## 常见问题

### 为什么如此之慢

可以尝试缩小Thinking Budget, 不过太小的值会让AI 输出错误结果

同时, 如果不需要详细的解析可以尝试如下prompt

```text
用中文输出答案
只需要输出答案即可，选择题不需要输出解析(留白即可)
```

### 为什么总是失败

- 检查你的IP 是否被Google 拉黑
- 检查API Key 是否有效
- 尝试使用 `gemini-2.5-flash` 模型

### 我的电脑上没有摄像头, 请帮帮我

[SkidCamera](https://github.com/cubewhy/SkidCamera) 正是您想要的。

为自学者设计的符合人体工程学的相机软件

请参照 SkidCamera README 中的步骤来使用

## Star 历史记录

如果这个项目节省了你的时间, 请务必献上一个 Star!

[![Star History Chart](https://api.star-history.com/svg?repos=cubewhy/skid-homework&type=Date)](https://www.star-history.com/#cubewhy/skid-homework&Date)

## 为什么太多作业不好

- 浪费时间
- 效率低下
- 影响睡眠质量
- 影响心理健康

## 觉得这违反了道德规范?

如果您这么认为，请不要使用它。

家庭作业旨在帮助学生理解知识，
而不是用来控制学生。

我个人使用可汗学院和维基百科来学习，
既省时又高效。

但学校可能会要求我提交作业...
这个平台只是解决这个问题的一个变通方法。

### 免责声明

本项目鼓励用户遵守学术诚信.

本项目使用 GPLv3 授权, 开发者无权控制软件的分发.

## 开发

- Clone 本存储库
- 运行 `pnpm i`
- 运行 `pnpm run dev` 来预览

欢迎PR

## License

This work is licensed under GPL-3.0

You're allowed to use, share and modify.
