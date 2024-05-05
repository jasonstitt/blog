import { Cloudinary } from '@cloudinary/url-gen'
import { TextStyle } from '@cloudinary/url-gen/qualifiers/textStyle'
import { source } from '@cloudinary/url-gen/actions/overlay'
import { text } from '@cloudinary/url-gen/qualifiers/source'
import { size } from '@cloudinary/url-gen/qualifiers/textFit'

const client = new Cloudinary({
  cloud: {
    cloudName: 'countergram'
  }
})

export function ogimg (overlayText: string) {
  return client
    .image('ogimg-jasonstitt-bg_hf8wza')
    .overlay(
      source(
        text(overlayText, new TextStyle('Source Sans Pro', 120).fontWeight('bold').lineSpacing(-15))
          .textColor('#eeeeee')
          .textFit(size(1450))
      )
    )
    .toURL()
}
