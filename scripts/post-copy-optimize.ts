import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import glob from 'fast-glob';

const MAX_WIDTH = 1920;
const QUALITY = 85;
const OPTIMIZE_THRESHOLD_KB = 500; // Only optimize images larger than 500KB

async function optimizeImage(imagePath: string): Promise<boolean> {
  try {
    const ext = path.extname(imagePath).toLowerCase();
    
    // Skip if already webp, svg, or gif
    if (ext === '.webp' || ext === '.svg' || ext === '.gif') {
      return false;
    }
    
    // Skip backup files
    if (imagePath.includes('.original.')) {
      return false;
    }
    
    // Check file size
    const stats = await fs.stat(imagePath);
    const sizeKB = stats.size / 1024;
    
    // Get image metadata
    const metadata = await sharp(imagePath).metadata();
    
    if (!metadata.width || !metadata.height) {
      return false;
    }
    
    // Only process if image is large (either by dimensions or file size)
    if (metadata.width <= MAX_WIDTH && sizeKB <= OPTIMIZE_THRESHOLD_KB) {
      return false;
    }
    
    console.log(`Optimizing ${path.basename(imagePath)} (${metadata.width}x${metadata.height}, ${sizeKB.toFixed(0)}KB)`);
    
    const dir = path.dirname(imagePath);
    const basename = path.basename(imagePath, ext);
    const webpPath = path.join(dir, `${basename}.webp`);
    
    // Determine target dimensions
    let targetWidth = metadata.width;
    let targetHeight = metadata.height;
    
    if (metadata.width > MAX_WIDTH) {
      const aspectRatio = metadata.height / metadata.width;
      targetWidth = MAX_WIDTH;
      targetHeight = Math.round(MAX_WIDTH * aspectRatio);
    }
    
    // Convert to WebP
    await sharp(imagePath)
      .resize(targetWidth, targetHeight, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: QUALITY })
      .toFile(webpPath);
    
    // Update MDX references for this specific file
    await updateMDXReferences(imagePath, webpPath);
    
    // Remove original file
    await fs.unlink(imagePath);
    
    const webpStats = await fs.stat(webpPath);
    const savedKB = (stats.size - webpStats.size) / 1024;
    
    console.log(`  ✓ Converted to WebP: ${(webpStats.size / 1024).toFixed(0)}KB (saved ${savedKB.toFixed(0)}KB)`);
    
    return true;
  } catch (error) {
    console.error(`Error optimizing ${imagePath}:`, error);
    return false;
  }
}

async function updateMDXReferences(oldPath: string, newPath: string) {
  // Get relative paths for MDX files
  const oldFilename = path.basename(oldPath);
  const newFilename = path.basename(newPath);
  
  // Find all MDX files
  const mdxFiles = await glob('content/**/*.{md,mdx}', {
    absolute: true
  });
  
  for (const mdxFile of mdxFiles) {
    try {
      let content = await fs.readFile(mdxFile, 'utf-8');
      const originalContent = content;
      
      // Replace image references
      content = content.replace(
        new RegExp(oldFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        newFilename
      );
      
      if (content !== originalContent) {
        await fs.writeFile(mdxFile, content, 'utf-8');
      }
    } catch (error) {
      // Silent fail for individual files
    }
  }
}

async function main() {
  console.log('Post-copy image optimization starting...\n');
  
  // Find all images that were just copied
  const images = await glob('public/images/**/*.{png,jpg,jpeg,PNG,JPG,JPEG}', {
    absolute: true,
    ignore: ['**/*.original.*']
  });
  
  let optimized = 0;
  
  for (const imagePath of images) {
    const wasOptimized = await optimizeImage(imagePath);
    if (wasOptimized) {
      optimized++;
    }
  }
  
  if (optimized > 0) {
    console.log(`\n✓ Optimized ${optimized} images to WebP format`);
  } else {
    console.log('✓ All images are already optimized');
  }
}

main().catch(console.error);