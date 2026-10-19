import type { BunPlugin } from 'bun'
import tailwind from 'bun-plugin-tailwind'
import { Features, transform } from 'lightningcss'

const styles: BunPlugin = {
  name: 'tribe-styles',
  setup(build) {
    return tailwind.setup({
      ...build,
      onLoad(constraints, load) {
        return build.onLoad(constraints, async (args) => {
          const result = await load(args)
          if (result?.loader !== 'css') return result
          if (typeof result.contents !== 'string')
            throw new Error('Expected Tailwind to emit CSS text')

          // Flatten before Bun handles nested pseudo-elements and @supports.
          // https://github.com/oven-sh/bun/issues/45258
          return {
            ...result,
            contents: transform({
              filename: args.path,
              code: Buffer.from(result.contents),
              include: Features.Nesting,
              minify: true,
            }).code,
          }
        })
      },
    })
  },
}

export default styles
