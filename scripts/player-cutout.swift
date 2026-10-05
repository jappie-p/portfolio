// Regenerates src/assets/about/player.webp (the About portrait, cut out) from
// the cv photo, on-device with Apple Vision's foreground mask:
// swift scripts/player-cutout.swift ../personal/cv/cv_foto.jpg player.png && cwebp -quiet -q 88 -alpha_q 100 player.png -o src/assets/about/player.webp
import Foundation
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
guard let src = CGImageSourceCreateWithURL(input as CFURL, nil), let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("read") }
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
let req = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([req])
guard let obs = req.results?.first else { fatalError("no subject") }
let buf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
let mask = CIImage(cvPixelBuffer: buf)
let photo = CIImage(cgImage: cg)
let blend = CIFilter.blendWithMask()
blend.inputImage = photo
blend.backgroundImage = CIImage(color: .clear).cropped(to: photo.extent)
blend.maskImage = mask
let ctx = CIContext()
let out = blend.outputImage!
guard let result = ctx.createCGImage(out, from: photo.extent) else { fatalError("render") }
let dest = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, result, nil)
CGImageDestinationFinalize(dest)
print("ok", result.width, result.height)
