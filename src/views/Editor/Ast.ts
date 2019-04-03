import * as h from 'hastscript'
import * as rehypeParse from 'rehype-parse'
import * as rehypeStringify from 'rehype-stringify'
// import * as rehypeToReact from 'rehype-react'
import * as unified from 'unified'
import { Node } from 'unist'
import { text as t } from './hastscript-util'

export type Find = (node: HastNode, pos: Array<number>) => boolean

export const toAst: (html: string) => HastNode = unified().use(rehypeParse)
  .parse as any
export const toHtml: (node: HastNode) => string = unified().use(rehypeStringify)
  .stringify
// const toReact: (root: HastNode) => React.ReactElement = unified().use(
//   rehypeToReact,
//   {
//     createElement: React.createElement,
//   },
// ).stringify as any

export interface Properties {
  [key: string]: string
}

export interface HastNode extends Node {
  parent: HastNode
  index: number
  tagName: string
  properties: Properties
  children: Array<HastNode>
}

export default class Ast {
  private static traverse(
    tree: HastNode,
    pos: Array<number>,
    find: Find,
  ): boolean {
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i]
      const p = pos.concat([i])
      if (find(node, p)) {
        return true
      }
      if (Ast.traverse(node, p, find)) {
        return true
      }
    }
    return false
  }

  private static downstream(node: HastNode, indexes: Array<number>): HastNode {
    const index = indexes.shift()
    if (index === undefined) {
      return node
    }
    return Ast.downstream(node.children[index], indexes)
  }

  public root!: HastNode

  constructor(html?: string) {
    if (!html) {
      return
    }
    this.setHtml(html)
  }

  public setHtml(html: string): void {
    this.root = toAst(html).children[0].children[1] // root.html.body
    this.register(this.root)
  }

  public traverse(find: Find): void {
    Ast.traverse(this.root, [], find)
  }

  public nodeAt(indexes: Array<number>): HastNode {
    return Ast.downstream(this.root, indexes)
  }

  public wrap(
    start: HastNode,
    end: HastNode,
    startOffset: number,
    endOffset: number,
    tagName: string,
    properties: { [key: string]: string },
  ): void {
    if (start === end) {
      console.log('wrap:', start, end, tagName, properties)

      const text = start.value as string
      const text0 = text.substring(0, startOffset)
      const text1 = text.substring(startOffset, endOffset)
      const text2 = text.substring(endOffset)
      const args: Array<any> = [start.index, 1]
      if (text0) {
        args.push(t(text0))
      }
      if (text1) {
        args.push(h(tagName, properties, t(text1)))
      }
      if (text2) {
        args.push(t(text2))
      }
      console.log(args)
      start.parent.children.splice.apply(start.parent.children, args)
      this.register(start.parent)
      console.log(start.parent.children)
      console.log(this.toHtml())
    }
  }

  public find(node: HastNode): Array<number> {
    let pos: Array<number> = []
    this.traverse((n: HastNode, p: Array<number>) => {
      const found = n === node
      if (found) {
        pos = p
      }
      return found
    })
    return pos
  }

  public toHtml(): string {
    return this.root.children
      .map(node => {
        return toHtml(node)
      })
      .join('')
  }

  public blocksBetween(start: HastNode, end: HastNode): Array<HastNode> {
    return [start, end]
  }

  private register(parent: HastNode): void {
    if (!parent.children) {
      return
    }
    parent.children.forEach((child, index) => {
      child.parent = parent
      child.index = index
      this.register(child)
    })
  }

  // private addMark = (root: HastNode): HastNode => {
  //   if (root.type === 'element' && root.properties.id == null) {
  //     console.log(this.count)
  //     root.properties.id = `${this.count}`
  //     this.count = this.count + 1
  //   }
  //   if (root.children != null) {
  //     root.children.forEach(this.addMark)
  //   }
  //   return root
  // }
}
