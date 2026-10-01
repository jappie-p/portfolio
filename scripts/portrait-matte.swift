// Regenerates src/components/about/portrait-matte.webp from src/assets/about/jasper.webp, on-device.
// swift portrait-matte.swift jasper.webp matte.png && cwebp -quiet -lossless -z 9 matte.png -o portrait-matte.webp
import Foundation
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO
import UniformTypeIdentifiers

// usage: swift matte.swift in.webp out.png
let args = CommandLine.arguments
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
guard let src = CGImageSourceCreateWithURL(input as CFURL, nil), let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("read") }
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
let req = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([req])
guard let obs = req.results?.first else { fatalError("no subject") }
print("instances:", obs.allInstances.count)
let buf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
let mask = CIImage(cvPixelBuffer: buf)
print("mask size:", mask.extent)
// white image whose alpha is the mask
let white = CIImage(color: .white).cropped(to: mask.extent)
let blend = CIFilter.blendWithMask()
blend.inputImage = white
blend.backgroundImage = CIImage(color: .clear).cropped(to: mask.extent)
blend.maskImage = mask
let ctx = CIContext()
let out = blend.outputImage!
try ctx.writePNGRepresentation(of: out, to: output, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
print("wrote", output.path)
