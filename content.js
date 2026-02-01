// 全局变量
let directoryItems = [];
let directoryPanel = null;
let observer = null;
let currentTooltip = null;
let isPluginActive = false;

// 添加快捷键显示/隐藏目录
document.addEventListener('keydown', function(e) {
  // Ctrl+Shift+D 显示/隐藏目录
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    if (directoryPanel) {
      // 如果插件正在运行，关闭它
      hideDirectory();
    } else {
      // 如果插件已关闭，重新初始化
      initPlugin();
    }
  }
});

// 初始化插件
function initPlugin() {
  console.log('豆包对话目录插件初始化');
  isPluginActive = true;
  createDirectoryPanel();
  startObserving();
  
  // 延迟生成初始目录，确保页面完全加载
  setTimeout(() => {
    generateInitialDirectory();
  }, 1000);
}

// 创建目录面板
function createDirectoryPanel() {
  // 先检查是否已经存在目录面板
  if (document.getElementById('doubao-directory')) {
    directoryPanel = document.getElementById('doubao-directory');
    console.log('目录面板已存在');
    return;
  }
  
  directoryPanel = document.createElement('div');
  directoryPanel.id = 'doubao-directory';
  directoryPanel.className = 'directory-panel';
  
  // 面板标题
  const panelHeader = document.createElement('div');
  panelHeader.className = 'directory-header';
  
  // 标题文本
  const titleElement = document.createElement('h3');
  titleElement.textContent = '对话目录';
  panelHeader.appendChild(titleElement);
  
  // 控制按钮容器
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'directory-controls';
  
  // 最小化按钮
  const minimizeBtn = document.createElement('button');
  minimizeBtn.className = 'directory-btn minimize-btn';
  minimizeBtn.innerHTML = '−';
  minimizeBtn.title = '最小化';
  minimizeBtn.addEventListener('click', function() {
    minimizeDirectory();
  });
  controlsContainer.appendChild(minimizeBtn);
  
  // 最大化按钮
  const maximizeBtn = document.createElement('button');
  maximizeBtn.className = 'directory-btn maximize-btn';
  maximizeBtn.innerHTML = '□';
  maximizeBtn.title = '最大化';
  maximizeBtn.addEventListener('click', function() {
    maximizeDirectory();
  });
  controlsContainer.appendChild(maximizeBtn);
  
  // 关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.className = 'directory-btn close-btn';
  closeBtn.innerHTML = '×';
  closeBtn.title = '关闭';
  closeBtn.addEventListener('click', function() {
    hideDirectory();
  });
  controlsContainer.appendChild(closeBtn);
  
  panelHeader.appendChild(controlsContainer);
  
  // 目录内容区域
  const directoryContent = document.createElement('div');
  directoryContent.className = 'directory-content';
  directoryContent.id = 'directory-items-container';
  
  // 调整大小的手柄
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  
  directoryPanel.appendChild(panelHeader);
  directoryPanel.appendChild(directoryContent);
  directoryPanel.appendChild(resizeHandle);
  
  // 添加到页面
  document.body.appendChild(directoryPanel);
  console.log('目录面板创建完成');
  
  // 添加拖动功能
  initDragFunctionality();
  
  // 添加调整大小功能
  initResizeFunctionality();
  
  // 立即强制显示
  forceShowDirectory();
}

// 开始观察对话内容变化
function startObserving() {
  // 豆包特定的对话容器选择器
  const doubaoContainers = [
    '.chat-container',
    '.message-list',
    '.conversation-container',
    '.dialog-container',
    '.chat-content',
    '.message-content',
    '.conversation-content',
    '.dialog-content',
    '.chat-history',
    '.message-history',
    '.messages',
    '#chat-content',
    '#message-list',
    '[class*="chat"]',
    '[class*="message"]',
    '[class*="dialog"]'
  ];
  
  let chatContainer = null;
  for (const selector of doubaoContainers) {
    chatContainer = document.querySelector(selector);
    if (chatContainer) {
      console.log('找到对话容器:', selector);
      break;
    }
  }
  
  // 如果没找到特定容器，使用body作为备选
  if (!chatContainer) {
    chatContainer = document.body;
    console.log('使用body作为对话容器');
  }
  
  observer = new MutationObserver((mutations) => {
    // 检查是否有新内容添加
    let hasNewContent = false;
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        hasNewContent = true;
      }
    });
    
    if (hasNewContent) {
      console.log('检测到新内容，准备更新目录');
      // 延迟处理，确保DOM已完全加载
      setTimeout(() => {
        updateDirectory();
      }, 300);
    }
  });
  
  observer.observe(chatContainer, {
    childList: true,
    subtree: true
  });
  console.log('开始观察对话内容变化');
}

// 生成初始目录
function generateInitialDirectory() {
  console.log('开始生成初始目录...');
  
  const chatMessages = getChatMessages();
  console.log('找到对话消息:', chatMessages.length);
  
  // 过滤出用户消息并去重
  const userMessages = chatMessages.filter(msg => msg.isUser);
  const uniqueUserMessages = removeDuplicateMessages(userMessages);
  console.log('找到用户消息:', userMessages.length, '去重后:', uniqueUserMessages.length);
  
  // 清空现有目录
  const container = document.getElementById('directory-items-container');
  if (container) {
    container.innerHTML = '';
    directoryItems = [];
  }
  
  // 添加用户消息到目录
  uniqueUserMessages.forEach((message, index) => {
    addDirectoryItem(message, index);
  });
  
  // 如果没有找到用户消息，添加一个提示
  if (uniqueUserMessages.length === 0) {
    const container = document.getElementById('directory-items-container');
    if (container) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'directory-empty';
      emptyMessage.innerHTML = '<span>暂无用户消息，请开始对话...</span>';
      container.appendChild(emptyMessage);
    }
    console.log('未找到用户消息');
  }
  
  console.log('初始目录生成完成，共', uniqueUserMessages.length, '条');
}

// 判断是否为无关UI元素（按钮、标签等）
function isUIElement(text, element) {
  // 常见UI元素关键词
  const uiKeywords = [
    '分享', '复制', '点赞', '收藏', '举报', '删除', '编辑', '回复',
    '发送', '提交', '取消', '确定', '保存', '下载', '上传',
    'share', 'copy', 'like', 'favorite', 'report', 'delete', 'edit', 'reply',
    'send', 'submit', 'cancel', 'confirm', 'save', 'download', 'upload',
    '更多', '更多选项', 'more', 'options',
    '展开', '收起', 'expand', 'collapse',
    '查看', 'view', '查看详情',
    '点击', 'click', 'tap'
  ];
  
  // 检查是否包含UI关键词
  const hasUIKeyword = uiKeywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
  
  // 检查是否是按钮元素
  const isButton = element.tagName === 'BUTTON' || 
                   element.classList.contains('button') ||
                   element.classList.contains('btn') ||
                   element.getAttribute('role') === 'button';
  
  // 检查是否是链接
  const isLink = element.tagName === 'A' || 
                 element.classList.contains('link');
  
  // 检查是否是标签或徽章
  const isBadge = element.classList.contains('badge') ||
                  element.classList.contains('tag') ||
                  element.classList.contains('label');
  
  // 检查是否是图标容器
  const isIcon = element.classList.contains('icon') ||
                 element.classList.contains('svg') ||
                 element.querySelector('svg') !== null;
  
  // 检查是否是工具栏或操作栏
  const isToolbar = element.classList.contains('toolbar') ||
                    element.classList.contains('actions') ||
                    element.classList.contains('controls');
  
  // 综合判断
  return hasUIKeyword || isButton || isLink || isBadge || isIcon || isToolbar;
}

// 获取用户消息的纯文本内容（排除UI元素）
function getUserMessageText(element) {
  // 克隆元素以避免修改原始DOM
  const clone = element.cloneNode(true);
  
  // 移除常见的UI元素
  const uiSelectors = [
    'button', '.button', '.btn',
    'a', '.link',
    '.badge', '.tag', '.label',
    '.icon', '.svg', 'svg',
    '.toolbar', '.actions', '.controls',
    '.share', '.copy', '.like', '.favorite',
    '.report', '.delete', '.edit', '.reply',
    '.more', '.options'
  ];
  
  uiSelectors.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });
  
  // 获取纯文本
  let text = clone.textContent.trim();
  
  // 移除常见的UI关键词
  const uiKeywords = ['分享', '复制', '点赞', '收藏', '举报', '删除', '编辑', '回复', '更多'];
  uiKeywords.forEach(keyword => {
    text = text.replace(new RegExp(keyword, 'g'), '');
  });
  
  // 清理多余的空格和换行
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// 获取所有对话消息
function getChatMessages() {
  const messages = [];
  const capturedElements = new Set();
  
  // 直接遍历所有div元素，确保不遗漏任何消息
  const allElements = document.querySelectorAll('div');
  console.log('遍历所有div元素:', allElements.length);
  
  allElements.forEach((element) => {
    const text = getUserMessageText(element);
    
    // 跳过已被捕获的元素的子元素
    let isChildOfCaptured = false;
    for (const captured of capturedElements) {
      if (captured.contains(element)) {
        isChildOfCaptured = true;
        break;
      }
    }
    
    if (isChildOfCaptured) {
      return;
    }
    
    // 过滤掉文件上传记录
    if (isFileUploadRecord(text, element)) {
      return;
    }
    
    // 过滤掉UI元素
    if (isUIElement(text, element)) {
      return;
    }
    
    // 放宽文本长度要求，至少2个字符
    if (text && text.length > 2) {
      // 检测是否为用户消息（豆包特定的识别逻辑）
      const isUserMessage = 
        // 基于类名的识别
        element.classList.contains('user') ||
        element.classList.contains('human') ||
        element.classList.contains('sender-user') ||
        element.classList.contains('user-message') ||
        element.classList.contains('user-msg') ||
        element.classList.contains('message-user') ||
        element.classList.contains('msg-user') ||
        element.classList.contains('user-content') ||
        element.classList.contains('human-content') ||
        // 基于子元素的识别
        element.querySelector('.user') ||
        element.querySelector('.human') ||
        element.querySelector('.sender-user') ||
        element.querySelector('.user-avatar') ||
        element.querySelector('.user-icon') ||
        element.querySelector('.user-content') ||
        // 基于文本内容的识别
        element.textContent.includes('我:') ||
        element.textContent.includes('用户:') ||
        element.textContent.includes('你:') ||
        // 基于数据属性的识别
        element.getAttribute('data-role') === 'user' ||
        element.getAttribute('data-sender') === 'user' ||
        element.getAttribute('data-user') === 'true' ||
        element.getAttribute('role') === 'user' ||
        // 基于样式的识别
        element.style.alignSelf === 'flex-end' ||
        element.style.justifyContent === 'flex-end' ||
        // 基于位置的识别（右侧对齐的通常是用户消息）
        getComputedStyle(element).alignSelf === 'flex-end' ||
        getComputedStyle(element).justifyContent === 'flex-end' ||
        // 新增：基于父元素的识别
        (element.parentElement && (
          element.parentElement.classList.contains('user') ||
          element.parentElement.classList.contains('human') ||
          element.parentElement.getAttribute('data-role') === 'user'
        ));
      
      if (isUserMessage) {
        messages.push({
          element: element,
          text: text,
          timestamp: new Date(),
          isUser: true
        });
        capturedElements.add(element);
        console.log('识别到用户消息:', text.substring(0, 50));
      }
    }
  });
  
  console.log('总共识别到', messages.length, '条用户消息');
  return messages;
}

// 判断是否为文件上传记录
function isFileUploadRecord(text, element) {
  // 常见文件扩展名
  const fileExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.mp3', '.mp4', '.avi', '.zip', '.rar', '.7z', '.csv', '.json', '.xml', '.html', '.css', '.js', '.py', '.java', '.cpp', '.c', '.h', '.md'];
  
  // 检查是否包含文件扩展名
  const hasFileExtension = fileExtensions.some(ext => text.toLowerCase().includes(ext));
  
  // 检查是否包含文件上传相关的关键词
  const uploadKeywords = ['上传', '文件', '附件', 'attachment', 'upload', 'file'];
  const hasUploadKeyword = uploadKeywords.some(keyword => text.toLowerCase().includes(keyword));
  
  // 检查是否包含文件大小信息
  const hasFileSize = /\d+(\.\d+)?\s*(KB|MB|GB|TB)/i.test(text);
  
  // 检查元素是否包含文件相关的类名
  const hasFileClass = element.classList.contains('file') || 
                       element.classList.contains('upload') || 
                       element.classList.contains('attachment') ||
                       element.classList.contains('file-upload') ||
                       element.querySelector('.file') !== null ||
                       element.querySelector('.upload') !== null ||
                       element.querySelector('.attachment') !== null;
  
  // 如果文本很短且包含文件扩展名，很可能是文件名
  const isShortFileName = text.length < 50 && hasFileExtension;
  
  // 如果文本主要是文件名（包含扩展名且没有其他内容）
  const isPureFileName = hasFileExtension && text.split(/\s+/).length <= 3;
  
  // 综合判断：满足以下任一条件则认为是文件上传记录
  return isPureFileName || 
         isShortFileName || 
         (hasFileExtension && hasFileSize) ||
         (hasFileExtension && hasUploadKeyword) ||
         hasFileClass;
}
function addDirectoryItem(message, index) {
  // 只添加用户消息到目录
  if (message.isUser) {
    const summary = generateSummary(message.text);
    const timeLabel = getTimeLabel(message.timestamp);
    
    const item = {
      id: `directory-item-${index}`,
      summary: summary,
      fullText: message.text,
      timestamp: message.timestamp,
      element: message.element
    };
    
    directoryItems.push(item);
    renderDirectoryItem(item, index);
  }
}

// 生成摘要
function generateSummary(text) {
  // 提取核心关键词或主旨句
  const words = text.split(/\s+/);
  let summary = '';
  
  // 简单算法：取前几个关键词
  for (let i = 0; i < Math.min(words.length, 5); i++) {
    summary += words[i] + ' ';
  }
  
  // 确保摘要长度不超过15字
  return summary.trim().substring(0, 15);
}

// 获取时间标签
function getTimeLabel(timestamp) {
  const now = new Date();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (minutes < 1) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else {
    return `${hours}小时前`;
  }
}

// 渲染目录项
function renderDirectoryItem(item, index) {
  const container = document.getElementById('directory-items-container');
  if (!container) return;
  
  const itemElement = document.createElement('div');
  itemElement.id = item.id;
  itemElement.className = 'directory-item';
  itemElement.innerHTML = `
    <span class="item-index">${index + 1}.</span>
    <span class="item-summary">${item.summary}</span>
    <span class="item-time">${getTimeLabel(item.timestamp)}</span>
  `;
  
  // 添加点击事件
  itemElement.addEventListener('click', function() {
    scrollToMessage(item.element, this);
  });
  
  // 添加鼠标悬停事件
  itemElement.addEventListener('mouseenter', function(e) {
    showTooltip(this, item.fullText);
  });
  
  // 添加鼠标离开事件
  itemElement.addEventListener('mouseleave', function() {
    hideTooltip();
  });
  
  container.appendChild(itemElement);
}

// 显示tooltip
function showTooltip(element, text) {
  // 移除已存在的tooltip
  hideTooltip();
  
  // 创建tooltip元素
  const tooltip = document.createElement('div');
  tooltip.className = 'directory-tooltip';
  tooltip.textContent = text;
  
  // 添加到body
  document.body.appendChild(tooltip);
  currentTooltip = tooltip;
  
  // 计算位置
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const windowWidth = window.innerWidth;
  
  // 判断目录框在屏幕左侧还是右侧
  const isOnRightSide = rect.right > windowWidth / 2;
  
  let left, top;
  
  if (isOnRightSide) {
    // 目录框在右侧，tooltip显示在左边
    left = rect.left - tooltipRect.width - 10;
  } else {
    // 目录框在左侧，tooltip显示在右边
    left = rect.right + 10;
  }
  
  // 垂直居中
  top = rect.top + (rect.height - tooltipRect.height) / 2;
  
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

// 隐藏tooltip
function hideTooltip() {
  if (currentTooltip) {
    document.body.removeChild(currentTooltip);
    currentTooltip = null;
  }
}

// 更新目录
function updateDirectory() {
  const chatMessages = getChatMessages();
  
  // 过滤出用户消息并去重
  const userMessages = chatMessages.filter(msg => msg.isUser);
  const uniqueUserMessages = removeDuplicateMessages(userMessages);
  
  console.log('更新目录 - 找到用户消息:', userMessages.length, '去重后:', uniqueUserMessages.length, '当前目录项:', directoryItems.length);
  
  // 无论消息数量是否变化，都更新目录
  // 这样可以确保目录与实际对话内容保持同步
  const container = document.getElementById('directory-items-container');
  if (container) {
    container.innerHTML = '';
    directoryItems = [];
    
    // 添加用户消息到目录
    uniqueUserMessages.forEach((message, index) => {
      addDirectoryItem(message, index);
    });
    
    console.log('目录已更新，当前用户消息数:', directoryItems.length);
  }
}

// 滚动到对应消息
function scrollToMessage(element, clickedItem) {
  // 确保元素可见
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest'
  });
  
  // 添加高亮效果
  element.classList.add('message-highlight');
  
  // 3秒后移除高亮
  setTimeout(() => {
    element.classList.remove('message-highlight');
  }, 3000);
  
  // 给目录项添加点击反馈
  const directoryItems = document.querySelectorAll('.directory-item');
  directoryItems.forEach(item => {
    item.style.backgroundColor = '#383838';
  });
  
  // 高亮当前点击的目录项
  if (clickedItem) {
    clickedItem.style.backgroundColor = '#454545';
    clickedItem.style.borderColor = '#5f9ea0';
  }
}

// 去重用户消息
function removeDuplicateMessages(messages) {
  const uniqueMessages = [];
  const messageTexts = new Set();
  
  messages.forEach(message => {
    // 使用消息文本作为去重依据
    const text = message.text.trim();
    if (!messageTexts.has(text)) {
      messageTexts.add(text);
      uniqueMessages.push(message);
    }
  });
  
  return uniqueMessages;
}

// 强制显示目录面板
function forceShowDirectory() {
  if (directoryPanel) {
    directoryPanel.style.display = 'block';
    directoryPanel.style.visibility = 'visible';
    directoryPanel.style.opacity = '1';
    directoryPanel.style.zIndex = '999999';
    directoryPanel.style.position = 'fixed';
    
    // 只在第一次初始化时设置默认位置和大小
    if (!directoryPanel.dataset.initialized) {
      directoryPanel.style.right = '20px';
      directoryPanel.style.top = '100px';
      directoryPanel.style.left = 'auto';
      directoryPanel.style.width = '240px';
      directoryPanel.style.maxHeight = '600px';
      directoryPanel.dataset.initialized = 'true';
    }
    
    directoryPanel.style.pointerEvents = 'auto';
    console.log('强制显示目录面板');
  } else {
    // 如果目录面板不存在，重新创建
    createDirectoryPanel();
  }
}

// 添加测试数据，确保目录面板有内容显示
function addTestData() {
  console.log('添加测试数据');
  
  // 确保目录面板存在
  if (!directoryPanel) {
    createDirectoryPanel();
  }
  
  // 清空现有测试数据
  const container = document.getElementById('directory-items-container');
  if (container) {
    container.innerHTML = '';
    directoryItems = [];
  }
  
  // 创建测试消息
  const testMessages = [
    {
      text: '你好，我想了解如何使用豆包',
      element: document.body
    },
    {
      text: '豆包是一个智能助手，可以帮你解答问题、生成内容等',
      element: document.body
    },
    {
      text: '如何提高学习效率',
      element: document.body
    },
    {
      text: '建议制定合理的学习计划，保持专注，定期复习',
      element: document.body
    },
    {
      text: '豆包有哪些功能',
      element: document.body
    },
    {
      text: '豆包可以聊天、写作、翻译、编程等多种功能',
      element: document.body
    }
  ];
  
  // 添加测试消息到目录
  testMessages.forEach((message, index) => {
    addDirectoryItem({
      ...message,
      timestamp: new Date()
    }, index);
  });
  
  console.log('测试数据添加完成，共', testMessages.length, '条');
}

// 初始化插件
window.addEventListener('load', initPlugin);

// 延迟初始化，确保页面完全加载
setTimeout(initPlugin, 2000);

// 强制显示目录面板
setTimeout(forceShowDirectory, 3000);

// 确保目录面板显示
setTimeout(() => {
  if (!directoryPanel) {
    initPlugin();
  }
}, 4000);

// 定期检查并显示目录面板
setInterval(() => {
  if (isPluginActive && directoryPanel) {
    forceShowDirectory();
  }
}, 5000);

// 定期更新目录，确保捕获新消息
setInterval(() => {
  if (isPluginActive) {
    const container = document.getElementById('directory-items-container');
    // 检查目录是否为空，如果为空则重新生成
    if (container && container.children.length === 0) {
      console.log('目录为空，重新生成...');
      generateInitialDirectory();
    } else {
      updateDirectory();
    }
  }
}, 3000);

// 最小化目录
function minimizeDirectory() {
  if (directoryPanel) {
    const content = document.getElementById('directory-items-container');
    const resizeHandle = directoryPanel.querySelector('.resize-handle');
    if (content) {
      content.style.display = 'none';
    }
    if (resizeHandle) {
      resizeHandle.style.display = 'none';
    }
    directoryPanel.dataset.minimized = 'true';
  }
}

// 最大化目录
function maximizeDirectory() {
  if (directoryPanel) {
    const content = document.getElementById('directory-items-container');
    const resizeHandle = directoryPanel.querySelector('.resize-handle');
    if (content) {
      content.style.display = 'block';
    }
    if (resizeHandle) {
      resizeHandle.style.display = 'block';
    }
    directoryPanel.dataset.minimized = 'false';
  }
}

// 隐藏目录
function hideDirectory() {
  if (directoryPanel) {
    // 停止观察器
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    
    // 移除目录面板
    document.body.removeChild(directoryPanel);
    directoryPanel = null;
    
    // 清空目录项
    directoryItems = [];
    
    // 隐藏tooltip
    if (currentTooltip) {
      document.body.removeChild(currentTooltip);
      currentTooltip = null;
    }
    
    // 标记插件为非激活状态
    isPluginActive = false;
    
    console.log('插件已关闭');
  }
}

// 显示目录
function showDirectory() {
  if (directoryPanel) {
    directoryPanel.style.display = 'block';
  }
}

// 初始化拖动功能
function initDragFunctionality() {
  if (!directoryPanel) return;
  
  const header = directoryPanel.querySelector('.directory-header');
  if (!header) return;
  
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;
  
  header.addEventListener('mousedown', function(e) {
    // 如果点击的是按钮，不触发拖动
    if (e.target.closest('.directory-btn')) {
      return;
    }
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = directoryPanel.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    // 清除right样式，使用left定位
    directoryPanel.style.right = 'auto';
    
    header.style.cursor = 'grabbing';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    const newLeft = initialLeft + dx;
    const newTop = initialTop + dy;
    
    directoryPanel.style.left = newLeft + 'px';
    directoryPanel.style.top = newTop + 'px';
  });
  
  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      header.style.cursor = 'grab';
    }
  });
}

// 初始化调整大小功能
function initResizeFunctionality() {
  if (!directoryPanel) return;
  
  const resizeHandle = directoryPanel.querySelector('.resize-handle');
  if (!resizeHandle) return;
  
  let isResizing = false;
  let startX, startY, initialWidth, initialHeight;
  
  resizeHandle.addEventListener('mousedown', function(e) {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = directoryPanel.getBoundingClientRect();
    initialWidth = rect.width;
    initialHeight = rect.height;
    
    resizeHandle.style.cursor = 'nwse-resize';
    e.preventDefault();
    e.stopPropagation();
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    const newWidth = Math.max(200, initialWidth + dx);
    const newHeight = Math.max(100, initialHeight + dy);
    
    directoryPanel.style.width = newWidth + 'px';
    directoryPanel.style.maxHeight = newHeight + 'px';
  });
  
  document.addEventListener('mouseup', function() {
    if (isResizing) {
      isResizing = false;
      resizeHandle.style.cursor = 'nwse-resize';
    }
  });
}