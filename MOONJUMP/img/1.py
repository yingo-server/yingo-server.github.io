# tga2png.py
import sys
import struct
from PIL import Image

def tga_to_png(tga_path, png_path=None):
    """
    简单的 TGA 转换器，支持未压缩的 24/32 位真彩色图像。
    如果输入文件不符合这些条件，请用其他工具处理。
    """
    if png_path is None:
        png_path = tga_path.rsplit('.', 1)[0] + '.png'

    with open(tga_path, 'rb') as f:
        # 读取 TGA 头部 (18 字节)
        header = f.read(18)
        id_length = header[0]
        colormap_type = header[1]
        image_type = header[2]
        # colormap spec (5 bytes)
        # image spec (10 bytes)
        width = struct.unpack_from('<H', header, 12)[0]
        height = struct.unpack_from('<H', header, 14)[0]
        pixel_depth = header[16]
        image_descriptor = header[17]

        # 只处理未压缩的真彩色图像（类型 2）
        if image_type != 2:
            raise ValueError(f"不支持的图像类型: {image_type}，仅支持未压缩真彩色（类型2）")
        if pixel_depth not in (24, 32):
            raise ValueError(f"不支持的像素深度: {pixel_depth}")

        # 跳过 ID 字段
        f.read(id_length)

        # 读取像素数据
        bytes_per_pixel = pixel_depth // 8
        data = f.read(width * height * bytes_per_pixel)

        # TGA 像素顺序：BGR(A)，且垂直方向通常从下到上（取决于描述符第5位）
        # 这里假设 bottom-left origin (描述符 bit5 = 0)，这是最常见的
        mode = 'RGBA' if bytes_per_pixel == 4 else 'RGB'
        img = Image.frombuffer('RGB', (width, height), data, 'raw', 'BGR', 0, 1)
        if bytes_per_pixel == 4:
            # 需要分离 Alpha 通道
            # 读取全部数据并重组为 RGBA
            img_rgba = Image.frombuffer('RGBA', (width, height), data, 'raw', 'BGRA', 0, 1)
            img = img_rgba

        # 垂直翻转，因为 TGA 通常从下到上存储
        img = img.transpose(Image.FLIP_TOP_BOTTOM)
        img.save(png_path, 'PNG')
        print(f"转换完成: {tga_path} -> {png_path}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python tga2png.py <输入.tga> [输出.png]")
        sys.exit(1)
    tga_file = sys.argv[1]
    png_file = sys.argv[2] if len(sys.argv) > 2 else None
    tga_to_png(tga_file, png_file)