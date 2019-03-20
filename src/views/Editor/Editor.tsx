import * as React from 'react'
import ContentEditable from 'react-contenteditable'
import Ast, { HastNode, Properties } from './Ast'

export interface Wrapper {
  range: Range
  properties: { [key: string]: string }
}

interface Props {
  className?: string
  link?: Wrapper
  onSelect?: (selection: Selection) => void
  onUnselect?: () => void
  onLink?: () => void
}

interface State {
  html: string
}

export default class Editor extends React.Component<Props, State> {
  public ast = new Ast('<p><br /></p>')

  public state = {
    html: this.ast.toHtml(),
  }
  public ref = React.createRef()

  private isSelected = false

  public componentWillReceiveProps(
    nextProps: Readonly<Props>,
    nextContext: any,
  ): void {
    if (nextProps.link) {
      console.log('link!')
      this.wrap(
        nextProps.link.range,
        'a',
        nextProps.link.properties,
        this.props.onLink,
      )
    }
  }

  public render() {
    return (
      <div className={this.props.className} onSelect={this.onSelect}>
        <ContentEditable
          innerRef={this.ref as any}
          html={this.state.html}
          onChange={this.onChange}
          onBlur={this.onBlur}
        />
      </div>
    )
  }

  private onChange = (e: React.FormEvent<HTMLDivElement>) => {
    this.update(e.currentTarget.innerHTML)
  }

  private onSelect = (e: React.SyntheticEvent<HTMLDivElement>) => {
    const selection = this.emitOnUnselectWhenUnselected()
    if (!selection) {
      return
    }

    this.isSelected = true
    if (!this.props.onSelect) {
      return
    }
    this.props.onSelect(selection)
  }

  private onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    requestAnimationFrame(this.emitOnUnselectWhenUnselected)
  }

  private emitOnUnselectWhenUnselected = (): Selection | undefined => {
    const selection = window.getSelection()
    if (
      selection.type !== 'Range' ||
      (selection.anchorNode === selection.focusNode &&
        selection.anchorOffset === selection.focusOffset)
    ) {
      if (!this.isSelected) {
        return
      }
      this.isSelected = false
      if (!this.props.onUnselect) {
        return
      }
      this.props.onUnselect()
      return
    }
    return selection
  }

  private wrap(
    range: Range,
    tagName: string,
    properties: Properties,
    callback?: () => void,
  ) {
    const start = this.getHastNode(range.startContainer)
    const end = this.getHastNode(range.endContainer)

    this.ast.wrap(
      start,
      end,
      range.startOffset,
      range.endOffset,
      tagName,
      properties,
    )

    this.setState(
      {
        html: this.ast.toHtml(),
      },
      callback,
    )
  }

  private getHastNode(node: Node): HastNode {
    return this.ast.find(this.upstream(node))
  }

  private upstream(el: Node, indexes: Array<number> = []): Array<number> {
    const parent = el.parentNode
    if (!parent) {
      return indexes
    }
    let index = -1
    Array.prototype.every.call(parent.childNodes, (child: Node, i: number) => {
      if (child === el) {
        index = i
        return false // break
      }
      return true // continue
    })
    if (index === -1) {
      return indexes
    }
    indexes.unshift(index)
    if (parent === this.ref.current) {
      return indexes
    }
    return this.upstream(parent, indexes)
  }

  private update = (html: string) => {
    this.ast.setHtml(html)
    // console.log('---------------------------')
    // console.log(html)
    // console.log('===')
    // console.log(this.ast.toHtml())
    // console.log('---------------------------')

    this.setState({
      html: this.ast.toHtml(),
    })
  }
}
