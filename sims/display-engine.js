/**
 * Display Engine for Ant Colony TTRPG
 * Version: v0.5 - Enhanced terminal control with in-place updates and proper alignment
 */

class DisplayEngine {
  constructor() {
    // Terminal control settings
    this.terminalWidth = process.stdout.columns || 80;
    this.terminalHeight = process.stdout.rows || 24;
    
    // Display buffer for double buffering
    this.currentBuffer = '';
    this.lastBuffer = '';
    
    // Layout settings
    this.borderStyle = {
      horizontal: '─',
      vertical: '║',
      topLeft: '╔',
      topRight: '╗', 
      bottomLeft: '╚',
      bottomRight: '╝',
      cross: '╬',
      teeDown: '╦',
      teeUp: '╩',
      teeRight: '╠',
      teeLeft: '╣'
    };
    
    // Performance tracking
    this.frameCount = 0;
    this.lastRenderTime = Date.now();
    
    // Initialize terminal
    this.initializeTerminal();
  }

  /**
   * Initialize terminal settings
   */
  initializeTerminal() {
    // Hide cursor for cleaner display
    process.stdout.write('\x1b[?25l');
    
    // Enable alternative screen buffer (optional)
    // process.stdout.write('\x1b[?1049h');
    
    // Listen for terminal resize
    process.stdout.on('resize', () => {
      this.terminalWidth = process.stdout.columns || 80;
      this.terminalHeight = process.stdout.rows || 24;
    });
    
    // Clean up on exit
    process.on('exit', () => {
      this.cleanup();
    });
    
    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Clean up terminal state
   */
  cleanup() {
    // Show cursor
    process.stdout.write('\x1b[?25h');
    
    // Restore normal screen buffer
    // process.stdout.write('\x1b[?1049l');
    
    // Reset terminal
    process.stdout.write('\x1b[0m');
  }

  /**
   * Clear screen and reset cursor position
   */
  clearScreen() {
    process.stdout.write('\x1b[2J\x1b[H');
  }

  /**
   * Move cursor to specific position
   */
  moveCursor(x, y) {
    process.stdout.write(`\x1b[${y + 1};${x + 1}H`);
  }

  /**
   * Render content with in-place updates
   */
  render(content) {
    const newBuffer = this.prepareContent(content);
    
    if (newBuffer !== this.lastBuffer) {
      this.clearScreen();
      process.stdout.write(newBuffer);
      this.lastBuffer = newBuffer;
    }
    
    this.frameCount++;
  }

  /**
   * Prepare content for display with proper formatting
   */
  prepareContent(content) {
    const lines = content.split('\n');
    const prepared = [];
    
    for (let i = 0; i < Math.min(lines.length, this.terminalHeight - 1); i++) {
      let line = lines[i];
      
      // Ensure line doesn't exceed terminal width
      if (line.length > this.terminalWidth) {
        line = line.substring(0, this.terminalWidth - 3) + '...';
      }
      
      // Pad line to consistent width to prevent artifacts
      line = line.padEnd(this.terminalWidth);
      
      prepared.push(line);
    }
    
    return prepared.join('\n');
  }

  /**
   * Create a properly formatted panel with borders
   */
  createPanel(title, content, width = null) {
    const panelWidth = width || Math.min(60, this.terminalWidth - 4);
    const lines = [];
    
    // Top border with title
    if (title && title.length > 0) {
      const titleText = ` ${title} `;
      const titleLength = titleText.length;
      const remainingWidth = panelWidth - titleLength;
      const leftPadding = Math.floor(remainingWidth / 2);
      const rightPadding = remainingWidth - leftPadding;
      
      lines.push(
        this.borderStyle.topLeft + 
        this.borderStyle.horizontal.repeat(leftPadding) +
        titleText +
        this.borderStyle.horizontal.repeat(rightPadding) +
        this.borderStyle.topRight
      );
    } else {
      // No title, just solid border
      lines.push(
        this.borderStyle.topLeft + 
        this.borderStyle.horizontal.repeat(panelWidth) +
        this.borderStyle.topRight
      );
    }
    
    // Content lines
    const contentLines = content.split('\n');
    for (const contentLine of contentLines) {
      // Ensure content fits within panel width minus borders
      const maxContentWidth = panelWidth - 2; // Subtract 2 for left and right borders
      const trimmedContent = contentLine.substring(0, maxContentWidth);
      const paddedContent = trimmedContent.padEnd(maxContentWidth);
      lines.push(`${this.borderStyle.vertical}${paddedContent}${this.borderStyle.vertical}`);
    }
    
    // Bottom border
    lines.push(
      this.borderStyle.bottomLeft + 
      this.borderStyle.horizontal.repeat(panelWidth) +
      this.borderStyle.bottomRight
    );
    
    return lines.join('\n');
  }

  /**
   * Calculate the actual display width of a string (handling Unicode emojis)
   */
  getDisplayWidth(str) {
    if (!str) return 0;
    
    // Remove ANSI escape codes if any
    const cleanStr = str.replace(/\x1b\[[0-9;]*m/g, '');
    
    let width = 0;
    for (const char of cleanStr) {
      const code = char.codePointAt(0);
      
      // Emoji ranges (simplified)
      if (
        (code >= 0x1F600 && code <= 0x1F64F) || // Emoticons
        (code >= 0x1F300 && code <= 0x1F5FF) || // Misc Symbols and Pictographs
        (code >= 0x1F680 && code <= 0x1F6FF) || // Transport and Map
        (code >= 0x1F1E6 && code <= 0x1F1FF) || // Regional indicators
        (code >= 0x2600 && code <= 0x26FF) ||   // Misc symbols
        (code >= 0x2700 && code <= 0x27BF) ||   // Dingbats
        (code >= 0xFE00 && code <= 0xFE0F)      // Variation selectors
      ) {
        width += 2; // Most emojis take 2 display columns
      } else if (code > 0xFFFF) {
        width += 2; // Other wide Unicode characters
      } else {
        width += 1; // Regular ASCII/Latin characters
      }
    }
    
    return width;
  }

  /**
   * Create a fixed-width colony map panel
   */
  createColonyMapPanel(mapData, mapWidth, mapHeight) {
    const lines = [];
    
    // Fixed-grid approach: The map is logically mapWidth x mapHeight 
    // We need to calculate a FIXED terminal width that can accommodate
    // the worst case (all positions have emojis = 2 terminal columns each)
    
    // Calculate the MAXIMUM possible terminal width for any row
    // This gives us consistent panel sizing regardless of emoji content
    const maxPossibleTerminalWidth = mapWidth * 2; // Worst case: all emojis
    
    // Panel structure: left_border(1) + left_pad(1) + content(max_width) + right_pad(1) + right_border(1)
    const totalPanelWidth = maxPossibleTerminalWidth + 4;
    
    // Top border with title
    const titleText = ' COLONY VIEW ';
    const titleLength = titleText.length;
    const remainingWidth = Math.max(0, totalPanelWidth - titleLength);
    const leftPadding = Math.floor(remainingWidth / 2);
    const rightPadding = remainingWidth - leftPadding;
    
    lines.push(
      this.borderStyle.topLeft + 
      this.borderStyle.horizontal.repeat(leftPadding) +
      titleText +
      this.borderStyle.horizontal.repeat(rightPadding) +
      this.borderStyle.topRight
    );
    
    // Map content rows - each row uses the SAME terminal space
    for (let y = 0; y < mapHeight; y++) {
      let mapLine = this.borderStyle.vertical + ' '; // Left border + padding
      
      // Build the logical row (mapWidth characters)
      let rowContent = '';
      let currentTerminalWidth = 0;
      
      for (let x = 0; x < mapWidth; x++) {
        const char = (mapData[y] && mapData[y][x]) || '.';
        rowContent += char;
        currentTerminalWidth += this.getCharacterTerminalWidth(char);
      }
      
      // Add the row content
      mapLine += rowContent;
      
      // Pad to the fixed maximum terminal width
      // This ensures ALL rows take exactly the same terminal space
      const paddingNeeded = maxPossibleTerminalWidth - currentTerminalWidth;
      mapLine += ' '.repeat(paddingNeeded + 1) + this.borderStyle.vertical;
      
      lines.push(mapLine);
    }
    
    // Bottom border - matches top border exactly
    lines.push(
      this.borderStyle.bottomLeft + 
      this.borderStyle.horizontal.repeat(totalPanelWidth) +
      this.borderStyle.bottomRight
    );
    
    return lines.join('\n');
  }

  /**
   * Get the terminal width (columns) for a single character
   */
  getCharacterTerminalWidth(char) {
    if (!char) return 1;
    
    const code = char.codePointAt(0);
    
    // Emoji ranges that take 2 terminal columns
    if (
      (code >= 0x1F600 && code <= 0x1F64F) || // Emoticons
      (code >= 0x1F300 && code <= 0x1F5FF) || // Misc Symbols and Pictographs
      (code >= 0x1F680 && code <= 0x1F6FF) || // Transport and Map
      (code >= 0x1F1E6 && code <= 0x1F1FF) || // Regional indicators
      (code >= 0x2600 && code <= 0x26FF) ||   // Misc symbols
      (code >= 0x2700 && code <= 0x27BF) ||   // Dingbats
      (code >= 0xFE00 && code <= 0xFE0F)      // Variation selectors
    ) {
      return 2; // Most emojis take 2 terminal columns
    } else if (code > 0xFFFF) {
      return 2; // Other wide Unicode characters
    } else {
      return 1; // Regular ASCII/Latin characters
    }
  }

  /**
   * Create status line for minimal mode
   */
  createStatusLine(text) {
    const maxWidth = this.terminalWidth - 1;
    let statusLine = text.substring(0, maxWidth);
    statusLine = statusLine.padEnd(maxWidth); // Pad to clear any remaining characters
    return statusLine;
  }

  /**
   * Render status line in-place (for minimal mode)
   */
  renderStatusLine(text) {
    const statusLine = this.createStatusLine(text);
    
    // Move to beginning of line and overwrite
    process.stdout.write('\r' + statusLine);
  }

  /**
   * Get terminal dimensions
   */
  getTerminalSize() {
    return {
      width: this.terminalWidth,
      height: this.terminalHeight
    };
  }

  /**
   * Check if content fits in terminal
   */
  contentFitsInTerminal(content) {
    const lines = content.split('\n');
    
    if (lines.length > this.terminalHeight) return false;
    
    for (const line of lines) {
      if (line.length > this.terminalWidth) return false;
    }
    
    return true;
  }

  /**
   * Create responsive layout based on terminal size
   */
  createResponsiveLayout(sections) {
    const layout = [];
    let currentHeight = 0;
    const maxHeight = Math.max(24, this.terminalHeight - 2); // Ensure minimum reasonable height
    
    // Priority order: status (essential), colony view (most important), then others
    const priorityOrder = ['status', 'colony', 'title', 'activity', 'environment', 'controls'];
    const sectionMap = {};
    
    // Create section map with priorities
    sections.forEach((section, index) => {
      if (index === 0) sectionMap['title'] = section;
      else if (index === 1) sectionMap['status'] = section;
      else if (section.content.includes('COLONY VIEW')) sectionMap['colony'] = section;
      else if (section.content.includes('ENVIRONMENT')) sectionMap['environment'] = section;
      else if (section.content.includes('RECENT ACTIVITY')) sectionMap['activity'] = section;
      else if (section.content.includes('CONTROLS')) sectionMap['controls'] = section;
    });
    
    // Add sections in priority order, fitting what we can
    for (const priority of priorityOrder) {
      const section = sectionMap[priority];
      if (section && currentHeight + section.height < maxHeight) {
        layout.push(section.content);
        currentHeight += section.height;
      }
    }
    
    // If layout is empty, add at least the status section
    if (layout.length === 0 && sectionMap['status']) {
      layout.push(sectionMap['status'].content);
    }
    
    return layout.join('\n');
  }

  /**
   * Get render statistics
   */
  getRenderStats() {
    const now = Date.now();
    const timeSinceLastRender = now - this.lastRenderTime;
    const fps = timeSinceLastRender > 0 ? Math.round(1000 / timeSinceLastRender) : 0;
    
    this.lastRenderTime = now;
    
    return {
      frameCount: this.frameCount,
      fps: fps,
      terminalSize: `${this.terminalWidth}x${this.terminalHeight}`,
      bufferSize: this.lastBuffer.length
    };
  }

  /**
   * Test display with sample content
   */
  testDisplay() {
    const testContent = this.createPanel('TEST PANEL', 
      'This is a test of the display engine.\nIt should render properly aligned borders.\nAnd handle multi-line content correctly.'
    );
    
    this.render(testContent);
    
    setTimeout(() => {
      const stats = this.getRenderStats();
      const statusContent = this.createPanel('STATS', 
        `Frame Count: ${stats.frameCount}\nTerminal Size: ${stats.terminalSize}\nBuffer Size: ${stats.bufferSize} chars`
      );
      this.render(statusContent);
    }, 2000);
  }
}

module.exports = DisplayEngine;